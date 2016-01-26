title: Sharding data across service fabric partitions
description: Service fabric gives you two mechanisms out of the box when resolving which partition you hit when calling a Reliable Service. 
tags:
  - 'C#'
  - azure
  - .NET
  - servicefabric
categories:
  - development
date: 2016-01-14 14:58:24
---

Service fabric gives you two mechanisms out of the box when resolving which partition you hit when calling a Reliable Service. We'll ignore the singleton partitions as they won't help us with sharding.

* **Named Partition** - This is a fixed name for each partition configured at deploy time.
* **Ranged Partition** - This uses an `Int64` range to decide which partition a numbered key falls in.

More information can be found [here](https://azure.microsoft.com/en-gb/documentation/articles/service-fabric-concepts-partitioning/).

### Named Partitioning

A named partition allows you to specify explicitly which partition you want to access at runtime. A common example is to specify A-Z named partitions and use the first letter of your data as the key. This splits your data into 26 partitions. 

```xml
<Service Name="TestService">
  <StatefulService ServiceTypeName="TestServiceType" 
                   TargetReplicaSetSize="3" 
                   MinReplicaSetSize="2">
    <NamedPartition>
      <Partition Name="a"/>
      <Partition Name="b"/>
      ...
      <Partition Name="z"/>
    </NamedPartition>
  </StatefulService>
</Service>
```

The advantages to this are that it is simple and you know which partition your data goes in without a lookup. Unfortunately as we will test later, you are unlikely to get a good distribution of your data across the partitions.

### Ranged Partitioning

With a ranged partition the fabric tooling by default uses the entire `Int64` range as keys to decide which partition. It will then convert these into ranges or buckets depending on the partition count.

```xml
<Service Name="TestService">
  <StatefulService ServiceTypeName="TestServiceType" 
                   TargetReplicaSetSize="3" 
                   MinReplicaSetSize="2">
    <UniformInt64Partition PartitionCount="26"
                           LowKey="-9223372036854775808" 
                           HighKey="9223372036854775807" />
  </StatefulService>
</Service>
```

However to be able to lookup a partition we need a function which can reduce our data to an integer value. To use the configuration above we can convert our strings into an `Int64`. 

```csharp
var md5 = MD5.Create();
var value = md5.ComputeHash(Encoding.ASCII.GetBytes(value));
var key = BitConverter.ToInt64(value, 0);

var client = ServiceProxy.Create<ITestService>(
                    key, 
                    new Uri("fabric:/App/TestService"))
```

1. Hash the value to a fixed length byte array.
2. Convert the array to an `Int64`.
3. Create the client with the calculated key to connect to the service on that partition.

### Ranged Partition with Consistent Hashing

Rather than use the ranges, you can fix your keys and plug in your own hash algorithm to resolve the partition.

```xml
<Service Name="TestService">
  <StatefulService ServiceTypeName="TestServiceType" 
                   TargetReplicaSetSize="3" 
                   MinReplicaSetSize="2">
    <UniformInt64Partition PartitionCount="26" 
                           LowKey="0" 
                           HighKey="25" />
  </StatefulService>
</Service>
```

We now have a key range limited to 0-25 rather than the entire `Int64` range. We can resolve a client connected to this partition in the same way, however this time we need to compute a key that fits in this smaller range. I'm using the jump consistent hash implementation in [hydra](https://github.com/turowicz/Hydra).

```csharp
var shard = new JumpSharding().GetShard(value, 26);
var client = ServiceProxy.Create<ITestService>(
                    shard, 
                    new Uri("fabric:/App/TestService"))
```

1. Call get shard with the value and number of partitions to distribute across.
3. Create the client with the calculated key to connect to the service on that partition.

### Distribution

To benchmark the distribution we have a list of around 17000 real email addresses. This should give us an idea of how the sharding strategies will distribute the data across 26 partitions. Another advantage of using one of the `Int64` methods is that they can be used with any amount of partitions.

We are looking for an even number of accounts allocated to each partition.

<chart type="BarChart" 
       options="{'title':'Email accounts distribution comparison','vAxis':{'title':'Partitions'},'legend':{'position':'bottom'}, 'height':'750'}">
  <div></div>
</chart>

|Partition|Alphabet|Consistent Hash|Ranging|
|-|-|-|-|
|0|1569|684|650|
|1|912|682|730|
|2|1027|647|646|
|3|1175|662|701|
|4|513|687|700|
|5|415|665|658|
|6|581|653|684|
|7|466|693|637|
|8|405|657|690|
|9|1714|681|699|
|10|643|654|669|
|11|608|696|681|
|12|1800|734|665|
|13|526|717|647|
|14|213|693|613|
|15|793|693|676|
|16|31|654|683|
|17|1039|681|713|
|18|1562|661|665|
|19|803|708|747|
|20|46|653|709|
|21|268|693|666|
|22|301|678|679|
|23|55|702|675|
|24|134|670|708|
|25|136|737|744|

We can see from those results that sharding using the first character of an email produces wildly different partition sizes, not what we want! Both the jump hash and integer ranging methods produced very even parition sizes.

### Conclusion 

Based on these results I would use the ranged partitioning method, it produces provides good balancing and is fast to compute. An additional advantage is you do not need to know the partition count in the code, just map your data to an `Int64` and service fabric will do the rest. 