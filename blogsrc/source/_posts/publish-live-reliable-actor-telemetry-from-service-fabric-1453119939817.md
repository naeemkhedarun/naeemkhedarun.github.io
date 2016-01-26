title: Publish live reliable actor telemetry from service fabric
description: After you've got your service fabric application live, you might see performance issues which you didn't pick up in testing or simulated load tests. 
tags:
  - .NET
  - 'C#'
  - azure
  - servicefabric
categories:
  - development
date: 2016-01-18 12:25:39
---

After you've got your service fabric application live, you might see performance issues which you didn't pick up in testing or simulated load tests. This could be for a number of reasons.

* Unexpected actor bottleneck, they are [single threaded](https://azure.microsoft.com/en-gb/documentation/articles/service-fabric-reliable-actors-introduction/#concurrency).
* Time spent waiting on a bottlenecked actor.
* Large state affecting IO performance.

Reliable actors do not yet have interception interfaces to add in this kind of detailed telemetry, but with careful code its possible to do this with a dynamic proxy. I chose to use [LightInject](http://www.lightinject.net/#interception) for this but most of the framework would do the same job. I use statsd and graphite as my telemetry platform and I've had good experiences with [this nuget package](https://github.com/Pereingo/statsd-csharp-client)

We need to intercept object on both sides of the network boundary to cover these scenarios.

* Service fabrics initialisation to trace *OnLoadStateAsync*, *OnActivateAsync*, etc...
* Fabric client initialisation to trace client interface calls *IActorInterface.YourDoWorkMethodAsync*.

We can trace the former by using service fabrics dependency injection support to initialise the actors with a proxy inbetween. First we override fabrics initialisation to use our DI container which has dynamic proxy support.

```csharp
fabricRuntime.RegisterActorFactory(() => 
    ServiceLocator.Current.GetInstance<YourActor>());
```

Next we tell our DI container to resolve these types with a proxy that includes our telemetry interceptor.

```csharp
serviceRegistry.Intercept(registration => 
    typeof(IActor).IsAssignableFrom(registration.ServiceType),
    (factory, definition) =>
    {
        definition.Implement(factory.GetInstance<ActorInterceptor>);
    });
```

This will catch the timings for any calls to actors made by the fabric system. Now we need to get the timings for all the calls we make, both *actor to actor* and *client to actor*.

```csharp
public class ActorFactory : IActorFactory
{
    readonly ActorInterceptor _actorInterceptor;
    readonly ConcurrentDictionary<Type, Type> _proxies = 
        new ConcurrentDictionary<Type, Type>();

    public ActorFactory(ActorInterceptor actorInterceptor)
    {
        _actorInterceptor = actorInterceptor;
    }

    public T Get<T>(ActorId actorId) where T : IActor
    {
        var proxyType = _proxies.GetOrAdd(typeof(T), type =>
            new ProxyBuilder().GetProxyType(
                new ProxyDefinition(typeof(T), true).Implement(
                    () => _actorInterceptor)));

        return (T)Activator.CreateInstance(proxyType, 
            new Lazy<T>(() => ActorProxy.Create<T>(actorId)));
    }
}
```

Above we've created a factory class which should be used by clients and actors to create the proxied ActorProxies. We cache the generated proxy types in a thread safe dictionary as they are [expensive to create](http://naeem.khedarun.co.uk/blog/2016/01/18/a-look-at-performance-on-dotnet-dynamic-proxies-1448894394346/).

Lastly we need the intercetor itself. We need to be sympathetic towards:

* All actor calls return a Task.
* Avoid blocking calls by calling `Result` or `Wait` on the task.

We can use a task continuation to handle the writing of telemetry together with a closure to capture the timer. If there is a return value we should return it, and for whatever reason that value is not a Task then we won't try to add the continuation.

```csharp
public class ActorInterceptor : IInterceptor
{
    public Object Invoke(IInvocationInfo invocationInfo)
    {
        var name = string.Format("Actors.{0}.{1}",
            invocationInfo.Proxy.Target.GetType().Name,
            invocationInfo.Method.Name);

        var timer = Metrics.StartTimer(name);

        var returnValue = invocationInfo.Proceed();

        (returnValue as Task)?.ContinueWith(task =>
        {
           timer.Dispose();
        });

        return returnValue;
    }
}
```

If you have your metrics library configured to push to a graphite backend you can use the following query to graph it:

```
stats.timers.actors.*.*.mean
stats.timers.actors.*.*.count
```

![actor telemetry](/blog/images/actor-telemetry.png)

