title: Logging all unhandled exceptions in .NET
description: With most applications its easy to get started on logging. However this will not log unhandled exceptions from places you couldn't forsee. So let's log these just in case anything goes wrong.
tags:
  - .NET
  - 'C#'
categories:
  - development
date: 2016-01-05 15:46:54
---

With most applications its easy to get started on logging.

* Install a logging framework like NLog or log4net.
* Put try catches around your main program logic and include contextual information with the exception.
* If its a web application use a logging middleware for your web framework.

However this will not log unhandled exceptions from places you couldn't forsee. So let's log these just in case anything goes wrong.

Any exceptions which crash the application can be handled using the `UnhandledException` event.

```csharp
AppDomain.CurrentDomain.UnhandledException += (sender, args) =>
{
    Log.Exception((Exception)args.ExceptionObject);
};
```

This will help you diagnose fatal errors. Unfortunately not all exceptions are fatal, and if you have any timers, unawaited async or unhandled task pool exceptions these can cause your application to behave unexpectedly without you knowing about it.

You can use the UnobservedTaskException to catch some of those ones:

```csharp
TaskScheduler.UnobservedTaskException += (sender, args) =>
{
    if (!args.Observed)
    {
        Log.Exception(args.Exception);
    }
};
```

If you know any other events or ways to get more of these unexpected errors please let me know!