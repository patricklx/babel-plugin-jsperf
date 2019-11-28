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

    const variableParent = path.findParent(p => p.isVariableDeclarator())
    if (variableParent && t.isIdentifier(variableParent.node.id)) {
      return variableParent.node.id.name
    }

    return 'function';
}

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
        path.traverse({
          ReturnStatement (returnPath) {
            const id = returnPath.scope.generateUidIdentifier('returnValue')
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
