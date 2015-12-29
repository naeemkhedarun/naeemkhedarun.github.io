If you have a virtual machine extension described like:
```
{
  "type": "Microsoft.Compute/virtualMachines/extensions",
  "name": "[variables('configure')]",
}
```

Then from another extension you can declare it as a dependency by doing:

```
{
      "dependsOn": [
        "[concat('Microsoft.Compute/virtualMachines/', variables('vmName'))]",
        "[concat('Microsoft.Compute/virtualMachines/', variables('vmName'), '/extensions/configure')]"
      ]
}
```

This way the second resource will only be executed if the first one has completed successfully.

