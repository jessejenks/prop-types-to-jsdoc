/**
 * Translates a parse tree into javadoc / jsdoc format
 * @author Jesse E. Jenks <jesse@hexinsights.com>
 */
function convertParseToJsDoc(parse) {
    const components = [];
    for (let component of parse) {
        components.push(handleComponentParse(component));
    }
    return components.join('\n\n');
}

function handleComponentParse(componentTree) {
    const description = formatComponentDescription(componentTree.componentDescription);
    const allProps = [`/**\n * ${componentTree.componentName} ${description}`];
    for (let prop of componentTree.props) {
        allProps.push(handlePropParse(prop));
    }
    allProps.push(' */')
    return allProps.join('\n');
}

function handlePropParse(propTree, prefixName=null) {
    const propAndChildren = [];
    const propName = prefixName === null? propTree.name : `${prefixName}.${propTree.name}`;
    const name = propTree.required? `${propName}` : `[${propName}]`;
    const description = formatPropDescription(propTree.description)
    let typeDescription;
    let shouldTraverseChildren = false;

    if (propTree.type === "arrayOf") {
        typeDescription = `[]${getSubTypeDescription(propTree.children[0])}`;
    } else if (propTree.type === "objectOf") {
        typeDescription = `Object{ [x: string]: ${getSubTypeDescription(propTree.children[0])} }`;
    } else if (propTree.type === "instanceOf") {
        typeDescription = `instance of ${getSubTypeDescription(propTree.children[0])}`;
    } else if (["oneOf", "oneOfType"].includes(propTree.type)) {
        const subTypeDescriptions = [];
        for (child of propTree.children) {
            subTypeDescriptions.push(getSubTypeDescription(child));
        }
        typeDescription = `${subTypeDescriptions.join(' | ')}`;
    } else {
        typeDescription = getTypeName(propTree.type);
        shouldTraverseChildren = true;
    }


    const fullDescription = ` * @param {${typeDescription}} ${name} ${description}`;
    propAndChildren.push(fullDescription);

    if (shouldTraverseChildren &&  propTree.children) {
        for (child of propTree.children) {
            propAndChildren.push(handlePropParse(child, propName));
        }
    }
    return propAndChildren.join('\n');
}

function formatComponentDescription(descriptionArray) {
    const desc = descriptionArray.map(line => ` * ${line}`).join('\n');
    if (desc !== "") {
        return `\n${desc}\n *`
    }
    return ""
}

function formatPropDescription(descriptionArray) {
    if (descriptionArray !== undefined && Array.isArray(descriptionArray)) {
        return descriptionArray.map((line, i) => i === 0? `- ${line}` : ` * ${line}`).join('\n');
    } else {
        return ""
    }
}

function getSubTypeDescription(typeTree) {
    if (typeTree.type === "arrayOf") {
        return `[]${getSubTypeDescription(typeTree.children[0])}`
    } else if (typeTree.type === "objectOf") {
        return `Object{ [x: string]: ${getSubTypeDescription(typeTree.children[0])} }`;
    } else if (typeTree.type === "instanceOf") {
        return `instance of ${getSubTypeDescription(typeTree.children[0])}`;
    } else if (typeTree.type === "exact") {
        return `Object{ ${flattenTypeObject(typeTree.children)} }`
    } else if (typeTree.type === "shape") {
        return `Object{ ${flattenTypeObject(typeTree.children)}, [x: string]: any }`
    } else if (typeTree.type === "oneOf" || typeTree.type === "oneOfType") {
        const subTypeDescriptions = [];
        for (child of typeTree.children) {
            subTypeDescriptions.push(getSubTypeDescription(child));
        }
        return `${subTypeDescriptions.join(' | ')}`;
    } else {
        switch(typeTree.type) {
            case "string-literal":
                return `"${typeTree.symbol}"`;
            case "alpha-numeric":
                return typeTree.symbol;
            default:
                return getTypeName(typeTree.type);    
        }
    }
}

function flattenTypeObject(children) {
    if (children === undefined || children.length === 0) {
        return "";
    }

    const obj = {};
    for (let child of children) {
        obj[child.name] = getSubTypeDescription(child);
    }

    return flattenObject(obj);
}

function flattenObject(obj) {
    const flattened = [];
    const keys = Object.keys(obj);
    let key;
    for (let i = 0; i<keys.length; i++) {
        key = keys[i];

        flattened.push(key);
        flattened.push(': ');
        if (isObject(obj[key])) {
            flattened.push(flattenObject(obj[key]));
        } else {
            flattened.push(obj[key]);
        }

        if (i < keys.length - 1) {
            flattened.push(', ');
        }
    }
    return flattened.join('');
}

function isObject(obj) {
    return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

function getTypeName(type) {
    switch(type) {
        case "bool":
            return "boolean";
        case "func":
            return "function";
        case "array":
        case "object":
        case "element":
        case "elementType":
        case "node":
            return capitalize(type);
        case "shape":
        case "exact":
            return "Object";
        case "number":
        case "string":
            return type;
        default:
            return type;
    }
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

module.exports = {
    convertParseToJsDoc,
}