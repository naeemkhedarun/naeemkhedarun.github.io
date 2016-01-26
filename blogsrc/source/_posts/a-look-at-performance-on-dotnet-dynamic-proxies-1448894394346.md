title: A look at performance on .NET dynamic proxies
description: I needed to proxy our service fabric actors to trace call timings and I wanted to see if their interception package was competitive with other open source offerings.
tags:
  - .NET
categories:
  - development
date: 2016-01-18 09:00:00
---

I currently use [LightInject](http://www.lightinject.net/) for dependency injection primarily for its good performance and well documented features. I needed to proxy our service fabric actors to trace call timings and I wanted to see if their [interception](http://www.lightinject.net/#interception) package was competitive with other open source offerings.

We'll take a look at:

* [Castle Dynamic Proxy](https://github.com/castleproject/Core) - This is likely the most popular dynamic proxy library for .NET.
* [LightInject Interceptor](http://www.lightinject.net/#interception) - I hadn't heard of this one until I started using LightInject.
* [NProxy](https://github.com/mtamme/NProxy) - Also a new one to me, but I've added it since it is easy to use.

### Creating proxy instances

<chart type="BarChart" 
       options="{'legend':{'position':'bottom'}, 'height':'300'}">
  <div></div>
</chart>

|  Library  |       Average Time (us) |
| --------------------- | -------------- |
| Castle |     2.5237 us |  
|  LightInject | 1047.9463 us | 
|       NProxy |     1.7470 us |  

I was quite surprised to see such a difference between the frameworks. I guessed that both NProxy and Castle cache their proxy types internally, which LightInject expects you to handle your own caching. Something good to bear in mind! 

After caching the proxy type things are a little more competitive:

<chart type="BarChart" 
       options="{'legend':{'position':'bottom'}, 'height':'300'}">
  <div></div>
</chart>

| Library |       Average Time (ns) |   
|--------------------- |-------------- |
| Castle | 2437.7655 ns | 
|  LightInject |   100.6836 ns |  
|       NProxy | 1670.7880 ns | 

I still think the code can be more optimal in all cases, so I reduced everything as much as possible to a single call to activate the proxy type. I've included timings for `Activator.CreateInstance` and the standard constructor against the non-proxy type as a baseline.

<chart type="BarChart" 
       options="{'legend':{'position':'bottom'}, 'height':'300'}">
  <div></div>
</chart>

|               Library |       Average Time (ns) |    
|--------------------- |-------------- |
| Castle |   109.5888 ns |
|  LightInject |    99.2248 ns | 
|       NProxy | 1041.4311 ns | 
|     Activator |    77.9584 ns | 
|   Constructor |     6.7176 ns | 

Things are much closer now! The difference between Castle and LightInject are negligible. There might be a way to optimise NProxy further but the API didn't yield any obvious optimisations.

### Calling proxied methods

Now let's take a look at the runtime overhead of calling a proxied object. I've included an unproxied instance as a baseline.

<chart type="BarChart" 
       options="{'hAxis':{'baseline':0}, 'legend':{'position':'bottom'}, 'height':'300'}">
  <div></div>
</chart>

|                 Library |   Average Time (ns) |  
|----------------------- |---------- |
| Castle | 2.9992 ns | 
|  LightInject | 2.9826 ns | 
|       NProxy | 2.9893 ns | 
|      No Proxy | 3.0494 ns | 

Surprisingly there is no overhead with any of the libraries with calling the proxied object. The graph looks skewed due to how close the results are and the timings are in nanoseconds. This is great news and we can use whichever library we want guilt-free. 

You can review the code for the benchmarks on [github](https://github.com/naeemkhedarun/Benchmarks/blob/master/Benchmarking/DynamicProxyBenchmark.cs).