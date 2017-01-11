title: OctoSearch - Cache and search Octopus Deploy variable sets
tags:
  - powershell
  - octopus
categories:
  - operations
date: 2017-01-11 11:58:53
---

When putting together new deployments the [octopus deploy](https://octopus.com/) interface does a great job. Unfortunately, when you have hundreds of deployments and thousands of variables it can become difficult to find and navigate the variables without search and filter functions.

As a stop-gap to Octopus hopefully adding this feature I've created [OctoSearch](https://github.com/naeemkhedarun/OctoSearch). This allows you to download and cache the variable sets with their variable collections locally as Text, Json or Html.

OctoSearch itself is a package available from nuget. It has been compiled down to a native executable so a dotnet core installation is not needed.

```
> nuget install OctoSearch
> cd .\tools\OctoSearch*\tools
> .\OctoSearch.exe
```

The first step is to login with the octopus server so we can create, download and cache an API token. This will be used for subsequent calls to octopus.

```
> .\OctoSearch.exe login -l https://octopus/ -u username
Please enter your password...
*********
Successfully logged in.
```
Now that we're authenticated we can download and cache the variable sets and their variable collections. This cache will be used for our searches to reduce the load on the Octopus server. Variables marked as sensitive won't have their values downloaded or cached; their variable names will be searchable but not their values.

```
> .\OctoSearch.exe cache
Saved LibraryVariableSet1.
Saved LibraryVariableSet2.
...
```

With the variables cached locally you can run fast searches and regenerate them into either Json or Html documents. To run a basic command line search you can use the search verb. It takes a regex so you can pass in basic text or more advanced text searches when you need to.

```
> .\OctoSearch.exe search --regex connectionstring
Database.ConnectionString            ConnectionStringOne
ServiceBus.ConnectionString          ConnectionStringTwo
```

To output the search results into a text file you can do:

```
> .\OctoSearch.exe search --regex connectionstring --output-file results.txt
```

To display all the variables in a html report we omit the regex to default to a greedy regex \w.. The html report has a client side search facility to filter variables for easier exploration.

```
> .\OctoSearch.exe search --output-file results.html --output-format html
```

This will give you a search UI that looks like:

![search report](https://github.com/naeemkhedarun/OctoSearch/raw/master/wiki/images/html-report.png)

If you would prefer it in Json:

```
> .\OctoSearch.exe search  --output-file results.json --output-format json
```

Once we have it in Json we can load and analyse it within powershell. For example to get all the variables marked as `IsSensitive` we could do:

```
> $variablesets = ConvertFrom-Json (gc -Raw .\results.json)
> ($variablesets | % { $_.Variables } | ? { $_.IsSensitive }).length
300
```

If you have any feedback or feature requests you can [create an issue](https://github.com/naeemkhedarun/OctoSearch/issues) or reach me [@naeemkhedarun](https://twitter.com/NaeemKhedarun).
