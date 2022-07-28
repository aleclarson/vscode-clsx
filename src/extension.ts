import {
  ExtensionContext,
  commands,
  window,
  Range,
  Position,
  TextEditor,
  TextDocument,
  workspace,
  Selection,
  TextEditorEdit,
} from 'vscode';

const classNameStringRegex = /class(name)?="([^"]+)"/i;
const classNamesImportRegex = /import \w+ from ['"]clsx['"](;)?/i;

export function activate(context: ExtensionContext) {
  const clsx = commands.registerCommand('extension.clsx', () => {
    try {
      checkConditions();
      const propPosition = getPropPosition();
      const newPropText = getNewClassNameProp(propPosition);
      getActiveEditor().edit((editBuilder) => {
        editBuilder.replace(propPosition, newPropText);
        addImportIfNeeded(editBuilder);
      });
    } catch (e) {
      window.showErrorMessage(`Error: ${e.message}`);
    }
  });

  context.subscriptions.push(clsx);
}

function checkConditions(): void {
  const editor = window.activeTextEditor;
  if (!editor) {
    throw new Error('Must have an active editor open');
  }
  const { document } = editor;
  if (
    document.languageId !== 'typescriptreact' &&
    document.languageId !== 'javascriptreact'
  ) {
    window.showErrorMessage('Must be jsx or tsx to use clsx');
    throw new Error('Must be jsx or tsx to use clsx');
  }
}

function getPropPosition(): Range {
  const lineNumber = getCurrentLineNumber();
  const lineText = getCurrentLineText();
  const propString = (lineText.match(classNameStringRegex) ?? [])[0];
  if (!propString) {
    throw new Error('could not find className prop');
  }
  const selectionIndex = getSelection().start.character;
  const startIndex = lineText.indexOf(propString);
  const endIndex = startIndex + propString.length;
  if (selectionIndex < startIndex || selectionIndex > endIndex) {
    throw new Error('this is not a clsx prop');
  }
  const startPosition = new Position(lineNumber, startIndex);
  const endPosition = new Position(lineNumber, endIndex);
  return new Range(startPosition, endPosition);
}

function getNewClassNameProp(propTextRange: Range): string {
  const propText = getDocument().getText(propTextRange);
  const className = propText.split('"')[1];
  if (!className) {
    throw new Error('could not parse class prop');
  }

  const importAlias = workspace
    .getConfiguration('clsx')
    .get<string>('importAlias');

  return `className={${importAlias}('${className}')}`;
}

function getCurrentLineNumber(): number {
  return getSelection().start.line as number;
}

function getCurrentLineText(): string {
  return getDocument().lineAt(getCurrentLineNumber()).text;
}

function needsClassNamesImport(): boolean {
  return !classNamesImportRegex.test(getDocument().getText());
}

function addImportIfNeeded(editBuilder: TextEditorEdit): void {
  if (needsClassNamesImport()) {
    const importPosition = new Position(1, 0);
    const importAlias = workspace
      .getConfiguration('clsx')
      .get<string>('importAlias');

    editBuilder.insert(importPosition, `import ${importAlias} from 'clsx';\n`);
  }
}

function getActiveEditor(): TextEditor {
  return window.activeTextEditor as TextEditor;
}

function getDocument(): TextDocument {
  return getActiveEditor().document;
}

function getSelection(): Selection {
  return getActiveEditor().selection;
}
