title: HttpClient DNS settings for Azure Cloud Services and Traffic Manager
tags:
  - .NET
  - azure
  - 'C#'
categories:
  - development
date: 2016-11-30 12:00:10
---

At my current workplace, some of our systems are approaching 1 Billion requests per day. At these volumes sub-optimal configuration between systems can cause significant issues and subtle performance degradation. To understand some of the issues we are facing I'm going back to basics. You can find the code for this post at [https://github.com/naeemkhedarun/TestHttpClient](https://github.com/naeemkhedarun/TestHttpClient).

Thanks to [Aliostad](http://byterot.blogspot.co.uk/2016/07/singleton-httpclient-dns.html) for his analysis on the HttpClient and [fschwiet](https://github.com/fschwiet/PSHostsFile) for writing the .NET hosts library which I've now taken off my own to-do list.

There are two DNS level scenarios that I want to investigate:

* Connect to the production cloud service slot after a VIP swap. Clients connect to a cloud service using a `cloudapp.net` DNS name which points to the Azure Load Balancer distributing traffic over the nodes.
* Resolve the latest Traffic Manager configuration. Traffic manager is a DNS level load balancer. Clients resolve a traffic manager address to an IP address and connect directly to the endpoint. So what happens when the IP changes? We'll try the scenario with both a Transient and Singleton HttpClient. 

#### Transient 

```csharp
[Fact]
public async Task TransientTimeoutTest()
{
    HostsFile.Set(_hostname, "127.0.0.1");
    var client = new TransientHttpClient(new Uri($"http://{_hostname}:9200"));

    var timer = Stopwatch.StartNew();
    try
    {
        await new LoopUntilFailure(client).ExecuteAsync(
            () => Task.Run(() => HostsFile.Set(_hostname, "128.0.0.1")));
    }
    catch
    {
        _logger.WriteLine(timer.ElapsedMilliseconds.ToString());
    }
}
```

> 133721ms

The transient client eventually behaves as expected despite taking 133 seconds to respect the change. The [ServicePointManager.DnsRefreshTimeout](https://msdn.microsoft.com/en-us/library/system.net.servicepointmanager.dnsrefreshtimeout.aspx) defaults to 120 seconds. This still leaves 13 seconds unaccounted for which I suspect is the final socket connection timeout. 

A test isolating the connection to the non-responsive endpoint yields: 

> 13086ms

I wasn't able to find any configuration for this timeout within .NET but I didn't manage to trace the framework source to an enumeration [WSAETIMEDOUT](https://msdn.microsoft.com/en-us/library/windows/desktop/ms740668.aspx#WSAETIMEDOUT). The timeout is controlled by the OS documented [here](https://technet.microsoft.com/en-us/library/cc938208.aspx).

> TCP/IP adjusts the frequency of retransmissions over time. The delay between the first and second retransmission is three seconds. This delay doubles after each attempt. After the final attempt, TCP/IP waits for an interval equal to double the last delay, and then it closes the connection request.

You find the default values for your OS (*in my case Windows Server 2016*) by running:

```
#  netsh interface tcp show global
Querying active state...

TCP Global Parameters
----------------------------------------------
Initial RTO              : 3000
Max SYN Retransmissions  : 2
```

So the result should be `(1 * 3000) + (2 * 3000) = 12000ms` which explains the extra time. Now the result is understood, let's re-run the test after dropping the DNS refresh timeout to 10 seconds.

```csharp
ServicePointManager.DnsRefreshTimeout = 10000;
```

> 25026ms

So with a transient HttpClient a working way to stay up to date with traffic manager configuration is to tune the `DnsRefreshTimeout` property to a good value for your application.

#### Singleton 

Using a singleton client will reuse the connection for many requests to reduce the overhead with starting new TCP connections. In this setup we still want the connection to be recreated occasionally so we get the latest DNS configuration.

```csharp
[Fact]
public async Task SingletonDnsChangeTest()
{
    HostsFile.Set(_hostname, "127.0.0.1");
    var client = new SingletonHttpClient(new Uri($"http://{_hostname}:9200"));

    var timer = Stopwatch.StartNew();
    try
    {
        await new LoopUntilFailure(client).ExecuteAsync(
            () => Task.Run(() => HostsFile.Set(_hostname, "128.0.0.1")));
    }
    catch
    {
        _logger.WriteLine(
            $"{typeof(IHttpClient).Name} - {timer.ElapsedMilliseconds}");
    }
}
```

> Cancelled after 180000

With a singleton HttpClient the connection is kept alive by default. This can be undesirable in configuration changes or scale out scenarios where you want your clients to connect to and use the new resources. Let's try the `DnsRefreshTimeout`.

```csharp
ServicePointManager.DnsRefreshTimeout = 10000;
```

> Cancelled after 180000

Since the connection is open and kept open, we need to find a way to close it. There is another setting which controls the length of time a connection is held open for called [ServicePointManager.ConnectionLeaseTimeout](https://msdn.microsoft.com/en-us/library/system.net.servicepoint.connectionleasetimeout.aspx).

```csharp
ServicePointManager.FindServicePoint(new Uri("http://testdns:9200"))
    .ConnectionLeaseTimeout = 10000;
```

> 145558

Unfortunately, having this setting alone isn't enough based on our previous transient experiments; the DNS is still cached. Let's combine the two settings.

> 33223

So now, despite using a singleton pattern within the code, our connections are being recreated and re-resolved up to every 20 seconds (both timeouts combined). 

