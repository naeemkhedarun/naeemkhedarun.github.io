title: Use Visual Studio Code as the default Git editor
description: I am not familar with the default Vim editor that comes with Git. It took me a while until I realised you can configure this. 
cover: images/vscode-rebase.png
tags:
  - git
categories:
  - development
date: 2016-01-21 15:58:44
---

I am not familar with the default [Vim](http://www.vim.org/) editor that comes with [Git](https://git-scm.com/), which makes interactive rebases difficult. It took me a while until I realised you can configure this. Thanks to [F Boucheros](http://stackoverflow.com/users/431072/f-boucheros) this is quite easy!

> git config --global core.editor "'C:\Program Files (x86)\Microsoft VS Code\code.exe' -w"  

And now when you run your `git rebase -i` the todo log will open in vscode.

![](/blog/images/vscode-rebase.png)
