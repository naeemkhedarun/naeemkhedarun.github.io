title: 'Azure Networking Bandwidth: Public IP vs Peered Networking'
tags:
  - azure
categories:
  - operations
date: 2016-10-16 23:54:30
---

We have a application setup which might be familiar to you; A cloud service in a classic virtual network (v1) which communicates with a database in an ARM virtual network (v2). Ideally we would like both of these services in a single network, but are restricted from doing so due to the deployment models. We had a discussion which involved performance, security and ideal topologies, however this post will solely focus on performance.

> Is there a difference in latency and bandwidth when they are both hosted in the same region?

### Test setup

To reflect the setup we have for our application, two VMs were provisioned in North Europe.

**Source**
* A3 (Large) Windows Cloud service
* Classic Virtual Network

**Destination**
* DS13v2 Linux Virtual machine
* ARM Virtual Network peered to the Classic VNet

### Traceroute

I first wanted to test the latency and number of hops between the VMs. ICMP is not available for this test as we are hitting a public IP, however we can use TCP by using [nmap](https://blogs.msdn.microsoft.com/gsamant/2015/02/16/ping-and-tracert-commands-on-azure-vm/).

```
PS C:\Users\user> nmap -sS -Pn -p 80 --traceroute 13.xx.xx.xx

HOP RTT     ADDRESS
1   ... 7
8   0.00 ms 13.xx.xx.xx
```

```
PS C:\Users\user> nmap -sS -Pn -p 80 --traceroute 10.xx.xx.xx

HOP RTT     ADDRESS
1   0.00 ms 10.xx.xx.xx
```

We can see that there are 8 hops over the public IP, and as we expect only a single hop over the peered network. Both routes are still extremely fast with negligible ping times. This confirms my collegues suspicions; despite connecting to a public address the traffic probably never leaves the datacenters perimeter network. 

### Bandwidth (iperf3)

To measure the bandwidth available between the VMs I'm using [iperf3](https://iperf.fr/iperf-download.php) which is cross platform. The test is run from the windows machine as a client and flows to the iperf server hosted on the linux box.

```bash
# Public IP test
.\iperf3.exe -c 13.xx.xx.xx -i 1 -t 30

# Peered network test
.\iperf3.exe -c 10.xx.xx.xx -i 1 -t 30
```

<chart type="LineChart" 
       options="{'legend':{'position':'bottom'}, 'height':'300', 'vAxis': { 'minValue': 0, 'title':'Bandwidth (Mbit)'}, 'hAxis':{'title':'Time (s)'}}">
  <div></div>
</chart>

| Seconds | Public IP | Peered |	
| ------- | --------- | ------ |
| 	1	| 	985	| 	996	| 
| 	2	| 	951	| 	947	| 
| 	3	| 	975	| 	976	| 
| 	4	| 	936	| 	956	| 
| 	5	| 	989	| 	962	| 
| 	6	| 	958	| 	965	| 
| 	7	| 	967	| 	962	| 
| 	8	| 	959	| 	926	| 
| 	9	| 	964	| 	985	| 
| 	10	| 	961	| 	948	| 
| 	11	| 	968	| 	953	| 
| 	12	| 	960	| 	980	| 
| 	13	| 	949	| 	957	| 
| 	14	| 	976	| 	966	| 
| 	15	| 	960	| 	949	| 
| 	16	| 	966	| 	972	| 
| 	17	| 	959	| 	954	| 
| 	18	| 	966	| 	975	| 
| 	19	| 	961	| 	969	| 
| 	20	| 	964	| 	963	| 
| 	21	| 	965	| 	962	| 
| 	22	| 	962	| 	933	| 
| 	23	| 	962	| 	993	| 
| 	24	| 	958	| 	961	| 
| 	25	| 	967	| 	958	| 
| 	26	| 	963	| 	958	| 
| 	27	| 	961	| 	956	| 
| 	28	| 	963	| 	970	| 
| 	29	| 	965	| 	962	| 
| 	30	| 	962	| 	963	| 

Surprisingly, both achieve the desired bandwith (1Gbps) for the selected VM sizes. 

I was still curious if the performance profile was the same when upgrading both VMs to support 10Gbps networking. For this test both machines were upgraded to the DS14v2 VM size. To maximise the bandwidth I used iperfs `-P` switch to run concurrent workers. The buffer size was also increased to see the effect it has on the bandwidth.

```bash
#Public IP with 4 processes
.\iperf3.exe -c 13.7xx.xx.xx -i 1 -t 30 -P 4
#Peered network with 4 processes
.\iperf3.exe -c 10.xx.xx.xx -i 1 -t 30 -P 4
#Public IP with 4 processes and 32MB buffer
.\iperf3.exe -c 13.xx.xx.xx -i 1 -t 30 -P 4 -w 32MB
#Peered network with 4 processes and 32MB buffer
.\iperf3.exe -c 10.xx.xx.xx -i 1 -t 30 -P 4 -w 32MB
```

<chart type="BarChart" 
       options="{'hAxis':{'baseline':0}, 'legend':{'position':'bottom'}, 'height':'300'}">
  <div></div>
</chart>

| Test                   |   Bandwidth (Mbps) |  
|----------------------- |---------- |
| Public IP              | 2480 | 
| Peered                 | 2630 | 
| Public IP (32MB) | 3230 | 
| Peered (32MB)    | 2710 | 

As expected, with the default values the peered network performed better although the difference was marginal. More surprisingly, the public network had a high thoroughput when the buffer size was increased and despite running the test multiple times I am unable to explain why.

For our workload and use case, I can say the performance difference between the two approaches is irrelevant. If you are evaluating whether you might gain network performance by switching to peered networking then I hope these numbers can help guide you. I would recommend running a similar test if you are choosing different VM sizes or workload.