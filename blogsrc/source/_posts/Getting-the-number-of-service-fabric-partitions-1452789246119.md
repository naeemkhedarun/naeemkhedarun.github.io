title: Getting the number of service fabric partitions
tags:
  - .NET
  - 'C#'
  - azure
  - servicefabric
categories:
  - development
date: 2016-01-14 16:34:19
---

You might need to programmatically lookup details about a service. The FabricClient class can be used to lookup various things from the cluster.

```csharp
var fabricClient = new FabricClient();
var partitions = await fabricClient.QueryManager.GetPartitionListAsync(
    new Uri($"fabric:/App/{serviceName}"));

var partition = partitions[0] //Select the first partition;
var partitionLowKey = ((Int64RangePartitionInformation)partition.PartitionInformation).LowKey;
```

The result of `GetPartitionListAsync` should never change for a service as you can't change the partition information after a service has been created. It would be safe and give better performance to cache this. 

The endpoint of the primary replica however can move between machines, so this does need to be resolved more frequently. You can also cache this if you have a retry strategy that will re-resolve after an `EndpointNotFoundException`.

```csharp
var resolver = new ServicePartitionResolver(() => fabricClient);
var resolvedPartition = await resolver.ResolveAsync(new Uri($"fabric:/App/{serviceName}"), partitionLowKey, CancellationToken.None);
```

