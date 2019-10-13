# PropTypes to JSDoc
---
This module provides a shell script to convert prop type definitions in `.jsx`
files into jsdoc format.


## Examples
### A Basic example
```js
function MyGreatComponent(props) {
    // ...
}

MyGreatComponent.propTypes = {
    /*
        This is a description of MyGreatComponent.
        It does this that and the other.
    */
    label: PropTypes.string, // This is description of label
    isNice: PropTypes.bool, // This is description of isNice
    // it is boolean used for things
    /*
        Here's a basic example
        @example <caption>Basic example</caption>
        <MyGreatComponent
            label="great-label"
            isNice
        />
    */
}
```

This will produce
```
/**
 * MyGreatComponent 
 * This is a description of MyGreatComponent.
 * It does this that and the other.
 *
 * @param {string} [label] - This is description of label
 * @param {boolean} [isNice] - This is description of isNice
 * it is boolean used for things
 * Here's a basic example
 * @example <caption>Basic example</caption>
 * <MyGreatComponent
 *     label="great-label"
 *     isNice
 * />
 */
```
### More complex example
```js
ComplexComponent.propTypes = {
    // This component has some complex props
    
    label: PropTypes.string, // the label to place on the thing
    aFlag: PropTypes.bool,
    // descriptions can appear after the declaration as well

    // this comment will be attached to the previous component
    options: PropTypes.shape({ // This comment will be ignored
        name: PropTypes.string, // The name of the value
        computeValue: PropTypes.func.isRequired, // The function to compute the value
    }), // display options

    stringContainer: PropTypes.arrayOf(PropTypes.string), // array of strings
    objectContainer: PropTypes.arrayOf(PropTypes.shape({
        nice: PropTypes.bool, // description
    })), // array of objects

    dataContainers: PropTypes.exact({
        complexArray: PropTypes.arrayOf(
            PropTypes.exact({
                name: PropTypes.string,
                // the name
                data: PropTypes.oneOfType([
                    PropTypes.object,
                    PropTypes.array,
                ]),
                // The data 
            })
        ), // the data object must match this shape

        complexObject: PropTypes.objectOf(
            PropTypes.exact({
                name: PropTypes.string,
                // the name
                data: PropTypes.oneOfType([
                    PropTypes.object,
                    PropTypes.array,
                ]),
                // The data 
            })
        ), // the data object must match this shape
    }), // data container

    valueOption: PropTypes.oneOf([
        "hello world",
        true,
        null,
    ]),
    /*
        Heres a description of `valueOption`
    */
    /*
        Heres an example
        @example
        <ComplexComponent { ...etc }/>
    */
}
```
Produces
```
/**
 * ComplexComponent 
 * This component has some complex props
 *
 * @param {string} [label] - the label to place on the thing
 * @param {boolean} [aFlag] - descriptions can appear after the declaration as well
 * this comment will be attached to the previous component
 * @param {Object} [options] - display options
 * @param {string} [options.name] - The name of the value
 * @param {function} options.computeValue - The function to compute the value
 * @param {[]string} [stringContainer] - array of strings
 * @param {[]Object{nice: boolean, [x: string]: any}} [objectContainer] - array of objects
 * @param {Object} [dataContainers] - data container
 * @param {[]Object{ name: string, data: Enum{ Object, Array } }} [dataContainers.complexArray] - the data object must match this shape
 * @param {Object{ [x: string]: Object{ name: string, data: Enum{ Object, Array } } }} [dataContainers.complexObject] - the data object must match this shape
 * @param {Enum{ "hello world", true, null }} [valueOption] - Heres a description of `valueOption`
 * Heres an example
 * @example
 * <ComplexComponent { ...etc }/>
 */
 ```


## Note about `static propTypes`
While this script can parse prop types declared with `static`, e.g.
```js
class MyGreatComponent extends Component {
    static propTypes = {
        /*
            This is a description of MyGreatComponent.
            It does this that and the other.
        */
        // ...
```
The name of the component will be displayed as `static`.
```
/**
 * static  
 * This is a description of MyGreatComponent.
 * It does this that and the other.
 ...
```

## Features
The main script is `prop-types-to-jsdoc.sh`, which accepts the following
options:

| Option | Meaning |
| --- | --- |
| `-d | --dir` | Path to input directory |
| `[-o | --out ]` | Path to output directory |
| `[-v | --verbose]` | Display file names as they get parsed |
| `[-w | --no-warnings`] | Suppress warnings (flag) |
| `[-h | --help]` | Help (Display help message) |

- `-d | --dir`
    This is the only required option. The script will loop over all files in all
    sub-directories to look for `.jsx` files.

- `-o | --out`
    If no output directory is given, the resulting jsdoc text will simply be
    logged.

- `-v | --verbose`
    Print the file name of the current file being converted. Useful when used
    without an output directory.

- `-w | --no-warnings`
    This flag suppresses warning (but not errors) from the parser. These are
    all style warnings, so you may or may not want to see these.
    **Note: If you are running this script for the first time it is recommended
    that you set this flag, as you will get a million warnings**

Another nice feature of this is that the script itself will redirect output as
you would expect. So for examle
```bash
> sh prop-types-to-jsdoc.sh --dir path/to/MyGreatComponent > MyGreatComponent.txt
```
will display warnings, but will not write those warnings into
`MyGreatComponent.txt`.

## Note on warnings
This script is not very smart, and will produce unecessary warnings at times.
In particular, it cannot tell the difference between inline and multi-line
arrays, so you will get a warning about trailing commas on any array with no
trailing comma.