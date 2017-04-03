title: NugetXray - Be proactive in keeping your packages up to date
tags:
  - powershell
  - 'C#'
  - nuget
categories:
  - development
date: 2017-04-03 14:51:21
---

The package management features within Visual Studio are fantastic when working within a single solution. It lets you know when there are new packages available and you are referencing multiple versions of the same package. There are some scenarios which could be improved:

* It's easy to forget to check whether there are new versions.
* Solutions composed of packages output by different repositories.

Some of our applications have code distributed across different repositories and packages. Since these are different solutions its difficult to use existing tools to detect when these packages are getting out of sync. [NugetXray](https://github.com/naeemkhedarun/NugetXray) has commands to do just that.

It's available at [nuget.org](https://www.nuget.org/packages/NugetXray/).

```
nuget install NugetXray
```

There are currently two commands: one to find out of date packages and another to find package version mismatches.

### Find packages with newer versions

To generate a diff report:

```
.\NugetXray.exe diff -d C:\git\source\

Scanning https://www.nuget.org/api/v2 for packages.configs.
WindowsAzure.Storage.2.1.0.4                                | -5.0.0      | 3   configs
Newtonsoft.Json.6.0.8                                             | -3.0.0      | 4   configs
WindowsAzure.Storage.4.3.0                                   | -3.0.0      | 1   configs
```

This shows us how many major, minor or patch versions we are behind by. You can generate a report across multiple repositories by setting the directory parameter to the root of both repositories.

You can also output either json or html if you want to build further tooling around it. The html report can included as a [third party teamcity report](https://confluence.jetbrains.com/display/TCD8/Including+Third-Party+Reports+in+the+Build+Results).

```
.\NugetXray.exe diff -d C:\git\source\ -f html -o diff.html
 ```

![](/blog/images/nx-diff.png) 

### Find packages which need consolidating

To find whether you have multiple versions of the same package, you can run the duplicate command.

```
.\NugetXray.exe duplicate -d C:\git\source\

Scanning C:\git\ConveyorBelt\ for packages.configs.
WindowsAzure.Storage                                                   | 2 versions

Errors:   1
```

As before you can include multiple solutions under a single root directory to find duplicates across solutions. It also supports both Json and Html output.

### Fail the build

If you want to integrate it with your build process, and fail when there are packages which need updating or consolidating, you can use the exit code. If calling from PowerShell you can get by calling `$LASTEXITCODE`. A negative exit code is returned to indicate there are results.

```
.\NugetXray.exe diff -d C:\git\source\
$LASTEXITCODE
-1
```

### Verbose flag

If you want more details output around the failures and which packages.config they refer to you can specify the `verbose` flag. 

If you have any feedback or feature requests you can create an [issue](https://github.com/naeemkhedarun/NugetXray/issues) or reach me [@naeemkhedarun](https://twitter.com/naeemkhedarun).