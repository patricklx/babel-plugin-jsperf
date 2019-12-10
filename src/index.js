/*eslint no-undef: "error"*/
/*eslint-env node*/
module.exports = function jsperf({ types: t }) {
  const PLUGIN_LABEL = 'jsperf';

  const timerCallee = t.memberExpression(
    t.identifier('console'),
    t.identifier('time'),
    false
  )

  const timerEndCallee = t.memberExpression(
    t.identifier('console'),
    t.identifier('timeEnd'),
    false
  )

  function createTimerStatement(callee, name) {
    return t.expressionStatement(t.callExpression(
      callee,
      [t.stringLiteral(name)]
    ));
  }

  function getName (path) {
    if (path.node.id && path.node.id.name) {
      return path.node.id.name;
    }

    if (path.node.key && path.node.key.name) {
      return path.node.key.name;
    }

    if (path.node.type === 'FunctionExpression') {
      return 'function';
    }

    const variableParent = path.findParent(p => p.isVariableDeclarator())
    if (variableParent && t.isIdentifier(variableParent.node.id)) {
      return variableParent.node.id.name
    }

    return 'function';
}

  let level = 0;
  return {
    name: 'babel-plugin-jsperf',
    visitor: {
      Function(path) {
        if (!path.node.loc) return;
        const label = this.file.opts.filename + ':' + (path.node.loc && (path.node.loc.start.line + ':'));
        if (path.isArrowFunctionExpression()) {
          path.arrowFunctionToShadowed()
        }
        const name = label + getName(path);
        path.get('body').unshiftContainer('body', [createTimerStatement(timerCallee, name)]);
        let returnStatement = false;

        let level = 0;
        path.traverse({
          Function: {
            enter() {
              level += 1;
            },
            exit() {
              level -= 1;
            }
          },
          ReturnStatement (returnPath) {
            if (returnPath.node.argument && returnPath.node.argument.name && returnPath.node.argument.name.startsWith('_returnValue')) {
              return;
            }
            if (level !== 0) return;
            const id = returnPath.scope.generateUidIdentifier('returnValue');
            returnPath.insertBefore(
              t.variableDeclaration('var', [
                t.variableDeclarator(id, returnPath.node.argument)
              ])
            )

            returnPath.insertBefore(
              createTimerStatement(timerEndCallee, name)
            )
            returnStatement = true
            returnPath.node.argument = id
          }
        });

        if (!returnStatement) {
          path.get('body').pushContainer('body', createTimerStatement(timerEndCallee, name));
        }
      }
    }
  };
}
