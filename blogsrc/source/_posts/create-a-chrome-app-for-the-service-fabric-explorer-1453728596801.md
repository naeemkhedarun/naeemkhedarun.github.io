title: Create a Chrome app for the Service Fabric Explorer
cover: images/servicefabric-dashboard.png
tags:
  - servicefabric
categories:
  - development
date: 2016-01-25 13:29:56
---

The new web based fabric explorer has a much nicer interface than the old desktop application. However we've lost the ability to pin it to the taskbar for quick shortcuts `win+n` and having it as a chrome tab is less convenient than its own window.

Thankfully Chrome can help with that. Open the fabric explorer:

> http://localhost:19080/explorer

Create the desktop app:

![More tools -> Create application shortcuts](/blog/images/chrome-create-application.png)

Then you can pin it to the taskbar as you would normally. You'll get a window with all the extra Chrome removed.

![](/blog/images/servicefabric-dashboard.png)

Whenever I want to switch to it I can use the taskbar shortcuts which in my case is `Win+4`.