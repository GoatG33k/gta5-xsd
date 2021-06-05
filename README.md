
# GTA5.xsd  
  
This utility generates XML XSD definitions for GTA5 (and soon RDR2)  so you can validate game metafiles in a modern IDE.

## Features

* Fully generated definition from the [RAGE game struct dumps](https://github.com/alexguirre/gtav-DumpStructs)
* Semi-correct type validation for each type
* **All game metadata types are supported**

### Known Issues
* Not all types may be correct at the moment, if you have a validation issue, please create an issue with the XML file with the issue, and the validation issue you are having
* `map<...>` types are not generated

## Usage
In the meta file you would like to check, add a `<!DOCTYPE>` element at the beginning with the root element. For example, with a **carcols** metafile, the original header would be:
```xml
<?xml version="1.0" encoding="UTF-8"?>  
<CVehicleModelInfoVarGlobal>
  <!-- stuff -->
</CVehicleModelInfoVarGlobal>
```

To enable validation, you will have to add the following line **BELOW** the `<?xml`, but before the root element (in this case, `<CVehicleModelInfoVarGlobal>`. You will also see that the root element is defined in the doctype. You will have to update this for the root element of each file you want to validate.
```xml
<?xml version="1.0" encoding="UTF-8"?>  
<!DOCTYPE CVehicleModelInfoVarGlobal SYSTEM "https://gitcdn.xyz/repo/GoatG33k/gta5-xsd/master/GTA5.xsd">  
<CVehicleModelInfoVarGlobal>
  <!-- stuff -->
</CVehicleModelInfoVarGlobal>
```

Then, any modern IDE should allow you to download the type definitions, and your file will be type-checked against the expected game values.

## Development
To generate the definitions, you will need to download the engine dumps from  [alexguirre/gtav-DumpStructs (github.com)](https://github.com/alexguirre/gtav-DumpStructs). 

To generate the GTA5.xsd, download the `dumps/gtav/b1234.txt` and place it in `dumps/gta5.txt`, then run `yarn build`. This will output a `GTA5.xsd` file in the project root.

## License
This code is provided for free under the MIT license.