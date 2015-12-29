title: Attaching and formatting drives with Azure ARM and PowerShell
tags:
  - powershell
  - azure
categories:
  - operations
date: 2015-12-03 12:02:16
---

Setting up a virtual machine in Azure using ARM has been made straightforward, even with one-click deployments. If you have any services that need a bigger disk, there are a few more moving parts to get it working. This is based on the [custom script quickstart template](https://github.com/Azure/azure-quickstart-templates/tree/master/windows-vm-custom-script) and [Ed Wilsons formatting script article](http://blogs.technet.com/b/heyscriptingguy/archive/2013/05/29/use-powershell-to-initialize-raw-disks-and-partition-and-format-volumes.aspx)

### Attach a disk

To attach a data disk to the virtual machine you can use the following configuration just below the osDisk definition.

```json
{
      "dataDisks":[{
            "lun":0,
            "name":"datadisk",
            "diskSizeGB":1000,
            "createOption":"Empty",
            "vhd":{
                  "Uri":"[variables('dataDiskUri')]"
            }
      }]
}
```

* lun (Logical Unit Number) should be unique for each attached disk and starts from zero.
* diskSizeGB has a maximum of 1000 (1 TB) in Azure currently.
* createOption should be "Empty" for a new disk.
* vhd.Uri is the full path you want the blob created in.

If we deployed the template with this now, we will get a raw unformatted disk with no drive label. You can view it in Disk Manager or by running the following PowerShell on the box.

```powershell
Get-Disk | Where partitionstyle -eq 'raw'
```

We need one more resource to complete the deployment and give us a formatted disk. We can use the CustomScriptExtension to run a PowerShell script which will format any raw attached disks (in case you want to do multiple drives).

```json
{
   "type":"Microsoft.Compute/virtualMachines/extensions",
   "name":"[concat(variables('vmName'),'/InitialiseDisks')]",
   "apiVersion":"2015-05-01-preview",
   "location":"[resourceGroup().location]",
   "dependsOn":[
      "[concat('Microsoft.Compute/virtualMachines/', variables('vmName'))]"
   ],
   "properties":{
      "publisher":"Microsoft.Compute",
      "type":"CustomScriptExtension",
      "typeHandlerVersion":"1.2",
      "settings":{
         "fileUris":[
            "[variables('initialiseDisksScript')]"
         ],
         "commandToExecute":"[concat('powershell -ExecutionPolicy Unrestricted -file ',parameters('scriptName'))]"
      }
   }
}
```

* dependsOn will need to be the resource path for our virtual machine to ensure this extension is run after its provisioned.
* fileUris is an array of any files we want downloaded and made available to execute. **This needs to be a path to an azure blob**, unfortunately you cannot link to any other domains like github.
* commandToExecute is a cmd.exe command, so we need to call out to powershell to invoke our script. The working directory will have your downloaded file already there, so you don't need the full path to execute it, just the name.

You will need to upload the following script to a blob:

```powershell
Get-Disk | ` 
Where partitionstyle -eq 'raw' | ` 
Initialize-Disk -PartitionStyle MBR -PassThru | ` 
New-Partition -AssignDriveLetter -UseMaximumSize | ` 
Format-Volume -FileSystem NTFS -NewFileSystemLabel "datadisk" -Confirm:$false
```
