/**
 * Codemod #3: Extract TypeScript interfaces from PropTypes (keeping PropTypes)
 *
 * Reads PropTypes definitions and generates corresponding TypeScript interfaces.
 * PropTypes are kept for JS users; the component is enhanced with proper TS typing.
 *
 * Usage:
 *   npx jscodeshift --parser=tsx --extensions=ts,tsx -t codemods/proptypes-to-ts.js packages/
 */

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function transformer(fileInfo, api) {
  var j = api.jscodeshift;
  var source = fileInfo.source;

  if (!source.includes('PropTypes') && !source.includes('propTypes')) {
    return undefined;
  }

  var root;
  try {
    root = j(source);
  } catch (e) {
    return undefined;
  }

  var hasChanges = false;

  function memberExprToStr(node) {
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'MemberExpression') {
      return memberExprToStr(node.object) + '.' + (node.property.name || node.property.value);
    }
    return '';
  }

  function mapBasicPropType(name) {
    var m = {
      string: 'string',
      number: 'number',
      bool: 'boolean',
      func: '(...args: unknown[]) => unknown',
      object: 'Record<string, unknown>',
      array: 'unknown[]',
      node: 'React.ReactNode',
      element: 'React.ReactElement',
      any: 'unknown',
      symbol: 'symbol',
    };
    return m[name] || 'unknown';
  }

  function mapImmutableBasic(name) {
    var m = {
      map: 'ImmutableMap<string, unknown>',
      orderedMap: 'ImmutableMap<string, unknown>',
      list: 'ImmutableList<unknown>',
      set: 'ImmutableSet<unknown>',
      contains: 'ImmutableMap<string, unknown>',
      mapContains: 'ImmutableMap<string, unknown>',
    };
    return m[name] || 'unknown';
  }

  function propTypeToTS(node) {
    if (!node) return 'unknown';

    if (
      node.type === 'MemberExpression' &&
      (node.property.name === 'isRequired' || node.property.value === 'isRequired')
    ) {
      return propTypeToTS(node.object);
    }

    if (node.type === 'MemberExpression') {
      var obj = memberExprToStr(node.object);
      var prop = node.property.name || node.property.value;
      if (obj === 'PropTypes') return mapBasicPropType(prop);
      if (obj === 'ImmutablePropTypes') return mapImmutableBasic(prop);
    }

    if (node.type === 'CallExpression') {
      var callee = node.callee;

      if (
        callee.type === 'MemberExpression' &&
        (callee.property.name === 'isRequired' || callee.property.value === 'isRequired')
      ) {
        return propTypeToTS({
          type: 'CallExpression',
          callee: callee.object,
          arguments: node.arguments,
        });
      }

      if (callee.type === 'MemberExpression') {
        var callObj = memberExprToStr(callee.object);
        var method = callee.property.name || callee.property.value;

        if (callObj === 'PropTypes') {
          if (method === 'oneOfType' && node.arguments[0] && node.arguments[0].type === 'ArrayExpression') {
            return node.arguments[0].elements.map(function(el) { return propTypeToTS(el); }).join(' | ');
          }
          if (method === 'arrayOf' && node.arguments[0]) {
            return propTypeToTS(node.arguments[0]) + '[]';
          }
          if (method === 'objectOf' && node.arguments[0]) {
            return 'Record<string, ' + propTypeToTS(node.arguments[0]) + '>';
          }
          if ((method === 'shape' || method === 'exact') && node.arguments[0] && node.arguments[0].type === 'ObjectExpression') {
            return objExprToTS(node.arguments[0]);
          }
          if (method === 'oneOf' && node.arguments[0] && node.arguments[0].type === 'ArrayExpression') {
            return node.arguments[0].elements.map(function(el) {
              if (el.type === 'StringLiteral' || (el.type === 'Literal' && typeof el.value === 'string')) return JSON.stringify(el.value);
              if (el.type === 'NumericLiteral' || (el.type === 'Literal' && typeof el.value === 'number')) return String(el.value);
              return 'unknown';
            }).join(' | ');
          }
          if (method === 'instanceOf' && node.arguments[0] && node.arguments[0].type === 'Identifier') {
            return node.arguments[0].name;
          }
        }

        if (callObj === 'ImmutablePropTypes') {
          if (method === 'listOf' && node.arguments[0]) {
            return 'ImmutableList<' + propTypeToTS(node.arguments[0]) + '>';
          }
          if (method === 'mapOf' && node.arguments[0]) {
            return 'ImmutableMap<string, ' + propTypeToTS(node.arguments[0]) + '>';
          }
          if (method === 'contains' || method === 'mapContains') {
            return 'ImmutableMap<string, unknown>';
          }
        }
      }
    }

    return 'unknown';
  }

  function objExprToTS(objExpr) {
    var props = objExpr.properties.map(function(prop) {
      if (prop.type === 'SpreadElement') return '';
      var key = prop.key.name || prop.key.value;
      var tsType = propTypeToTS(prop.value);
      var req = isRequired(prop.value);
      return key + (req ? '' : '?') + ': ' + tsType;
    }).filter(Boolean);
    return '{ ' + props.join('; ') + ' }';
  }

  function isRequired(node) {
    if (!node) return false;
    if (node.type === 'MemberExpression' && (node.property.name === 'isRequired' || node.property.value === 'isRequired')) {
      return true;
    }
    return false;
  }

  function extractProps(objExpr) {
    if (!objExpr || objExpr.type !== 'ObjectExpression') return null;
    var props = [];
    objExpr.properties.forEach(function(prop) {
      if (prop.type === 'SpreadElement') return;
      var key = prop.key ? (prop.key.name || prop.key.value) : null;
      if (!key) return;
      props.push({
        name: key,
        type: propTypeToTS(prop.value),
        required: isRequired(prop.value),
      });
    });
    return props;
  }

  function genInterface(name, props) {
    var lines = props.map(function(p) {
      return '  ' + p.name + (p.required ? '' : '?') + ': ' + p.type + ';';
    });
    return 'interface ' + name + ' {\n' + lines.join('\n') + '\n}';
  }

  function findDefaults(name) {
    var defaults = {};
    root.find(j.AssignmentExpression, {
      left: { type: 'MemberExpression', object: { name: name }, property: { name: 'defaultProps' } },
    }).forEach(function(path) {
      if (path.value.right.type === 'ObjectExpression') {
        path.value.right.properties.forEach(function(prop) {
          if (prop.key) defaults[prop.key.name || prop.key.value] = true;
        });
      }
    });
    root.find(j.ClassProperty, { static: true, key: { name: 'defaultProps' } }).forEach(function(path) {
      if (path.value.value && path.value.value.type === 'ObjectExpression') {
        path.value.value.properties.forEach(function(prop) {
          if (prop.key) defaults[prop.key.name || prop.key.value] = true;
        });
      }
    });
    return defaults;
  }

  // Process class components
  root.find(j.ClassDeclaration).forEach(function(classPath) {
    var className = classPath.value.id ? classPath.value.id.name : null;
    if (!className) return;

    var superClass = classPath.value.superClass;
    if (!superClass) return;

    var superName = superClass.type === 'MemberExpression' ? memberExprToStr(superClass) : superClass.name;
    if (superName !== 'React.Component' && superName !== 'React.PureComponent' && superName !== 'Component' && superName !== 'PureComponent') return;

    if (classPath.value.superTypeParameters) return;

    var propsObj = null;

    var body = classPath.value.body.body;
    for (var i = 0; i < body.length; i++) {
      var member = body[i];
      if (member.type === 'ClassProperty' && member.static && member.key && member.key.name === 'propTypes' && member.value && member.value.type === 'ObjectExpression') {
        propsObj = member.value;
        break;
      }
    }

    if (!propsObj) {
      root.find(j.AssignmentExpression, {
        left: { type: 'MemberExpression', object: { name: className }, property: { name: 'propTypes' } },
      }).forEach(function(path) {
        if (path.value.right.type === 'ObjectExpression') {
          propsObj = path.value.right;
        }
      });
    }

    if (!propsObj) return;

    var props = extractProps(propsObj);
    if (!props || props.length === 0) return;

    var defaults = findDefaults(className);
    props.forEach(function(p) { if (defaults[p.name]) p.required = false; });

    var interfaceName = className + 'Props';
    var interfaceStr = genInterface(interfaceName, props);

    // Add type parameter to the class via full source replacement
    var fullSource = root.toSource();

    // Add generic type parameter to the class extends clause
    var extendsPattern = new RegExp(
      '(class\\s+' + escapeRegex(className) + '\\s+extends\\s+(?:React\\.)?(?:Pure)?Component)\\s*\\{'
    );
    var updatedSource = fullSource.replace(extendsPattern, '$1<' + interfaceName + '> {');

    // Find the position of the class declaration (or export default class) and insert interface before it
    var classStartPattern = new RegExp('(^|\\n)(export\\s+default\\s+|export\\s+)?(class\\s+' + escapeRegex(className) + '\\b)', 'm');
    var classStartMatch = updatedSource.match(classStartPattern);
    if (classStartMatch) {
      var insertPos = updatedSource.indexOf(classStartMatch[0]);
      if (classStartMatch[1] === '\n') insertPos += 1; // skip the newline
      updatedSource = updatedSource.slice(0, insertPos) + interfaceStr + '\n\n' + updatedSource.slice(insertPos);
    }

    if (updatedSource !== fullSource) {
      try {
        root = j(updatedSource);
        hasChanges = true;
      } catch (e) {
        // skip
      }
    }
  });

  // Process function components with external propTypes
  root.find(j.AssignmentExpression).forEach(function(assignPath) {
    var left = assignPath.value.left;
    if (left.type !== 'MemberExpression' || !left.property || left.property.name !== 'propTypes' || left.object.type !== 'Identifier') return;

    var funcName = left.object.name;
    var propsObj = assignPath.value.right;
    if (!propsObj || propsObj.type !== 'ObjectExpression') return;

    if (root.find(j.ClassDeclaration, { id: { name: funcName } }).length > 0) return;

    var funcDecls = root.find(j.FunctionDeclaration, { id: { name: funcName } });
    if (funcDecls.length === 0) return;

    var props = extractProps(propsObj);
    if (!props || props.length === 0) return;

    var defaults = {};
    root.find(j.AssignmentExpression, {
      left: { type: 'MemberExpression', object: { name: funcName }, property: { name: 'defaultProps' } },
    }).forEach(function(path) {
      if (path.value.right.type === 'ObjectExpression') {
        path.value.right.properties.forEach(function(prop) {
          if (prop.key) defaults[prop.key.name || prop.key.value] = true;
        });
      }
    });
    props.forEach(function(p) { if (defaults[p.name]) p.required = false; });

    var interfaceName = funcName + 'Props';
    var interfaceStr = genInterface(interfaceName, props);

    var funcPath = funcDecls.at(0).get();
    var funcSource = j(funcPath).toSource();

    var annotatedSource = funcSource.replace(
      new RegExp('(function\\s+' + escapeRegex(funcName) + '\\s*\\()([^)]*)(\\))'),
      '$1$2: ' + interfaceName + '$3'
    );

    var fullSource = root.toSource();
    var updatedSource = fullSource.replace(funcSource, interfaceStr + '\n\n' + annotatedSource);
    try {
      root = j(updatedSource);
      hasChanges = true;
    } catch (e) {
      // skip
    }
  });

  if (hasChanges) {
    return root.toSource();
  }

  return undefined;
}

transformer.parser = 'tsx';
module.exports = transformer;
