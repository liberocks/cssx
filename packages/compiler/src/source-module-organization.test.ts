import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const sourceDirectory = fileURLToPath(new URL('.', import.meta.url));
const fixtureAndDatasetDirectories = new Set(['fixture', 'fixtures', 'dataset', 'datasets', '__fixtures__']);

/** Keeps dataset and test fixture contents outside the source-module line-count limit. */
function isFixtureOrDataset(filePath: string): boolean {
  return filePath.split(sep).some((segment) => fixtureAndDatasetDirectories.has(segment));
}

/** Lists TypeScript source files beneath a directory, including nested folders. */
function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listTypeScriptFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

/** Lists source and generated data files beneath a directory. */
function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }

    return entry.isFile() && /\.(?:ts|tsx|js|json)$/.test(entry.name) ? [entryPath] : [];
  });
}

/** Lists source directories beneath a package source root. */
function listSourceDirectories(directory: string): string[] {
  return [
    directory,
    ...readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = join(directory, entry.name);
      return entry.isDirectory() ? listSourceDirectories(entryPath) : [];
    }),
  ];
}

/** Excludes declarations, generated data, and test files from implementation checks. */
function isImplementationModule(filePath: string): boolean {
  return !filePath.endsWith('.d.ts') && !filePath.endsWith('.generated.ts') && !filePath.endsWith('.test.ts');
}

/** Reads named functions declared at module scope, excluding local callbacks. */
function readModuleFunctions(filePath: string): string[] {
  const source = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);

  return source.statements.flatMap((statement) => {
    if (ts.isFunctionDeclaration(statement)) {
      return [statement.name?.text ?? 'default'];
    }

    if (!ts.isVariableStatement(statement)) {
      return [];
    }

    return statement.declarationList.declarations.flatMap((declaration) => {
      const initializer = declaration.initializer;
      const isFunction = initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer));

      return isFunction && ts.isIdentifier(declaration.name) ? [declaration.name.text] : [];
    });
  });
}

/** Detects exported runtime declarations, including data-only modules. */
function hasExportedRuntimeDeclaration(filePath: string): boolean {
  const source = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);

  return source.statements.some((statement) => {
    const isExported =
      ts.canHaveModifiers(statement) &&
      (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);

    return (
      isExported &&
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        ts.isVariableStatement(statement))
    );
  });
}

describe('compiler source module organization', () => {
  const implementationModules = listTypeScriptFiles(sourceDirectory).filter(isImplementationModule);
  const workspacePackageRoot = join(sourceDirectory, '..', '..', '..', 'packages');

  it('keeps each module-level function in its own implementation file', () => {
    const modulesWithMultipleFunctions = implementationModules.flatMap((filePath) => {
      const functionNames = readModuleFunctions(filePath);

      return functionNames.length > 1 ? [`${filePath}: ${functionNames.join(', ')}`] : [];
    });

    expect(modulesWithMultipleFunctions).toEqual([]);
  });

  it('colocates a test file with every module-level function', () => {
    const functionModulesWithoutTests = implementationModules.filter((filePath) => {
      return readModuleFunctions(filePath).length > 0 && !existsTestFor(filePath);
    });

    expect(functionModulesWithoutTests).toEqual([]);
  });

  it('colocates a test file with each module that exports runtime code or data', () => {
    const runtimeModulesWithoutTests = implementationModules.filter((filePath) => {
      return hasExportedRuntimeDeclaration(filePath) && !existsTestFor(filePath);
    });

    expect(runtimeModulesWithoutTests).toEqual([]);
  });

  it('keeps package source folders at a readable size', () => {
    const packageSourceRoots = readdirSync(workspacePackageRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(workspacePackageRoot, entry.name, 'src'))
      .filter((directory) => existsSync(directory));
    const oversizedFiles = packageSourceRoots.flatMap((directory) =>
      listSourceFiles(directory).flatMap((filePath) => {
        if (isFixtureOrDataset(filePath)) {
          return [];
        }

        const lineCount = readFileSync(filePath, 'utf8').split(/\r?\n/).length;
        return lineCount > 1_000 ? [`${filePath}: ${lineCount} lines`] : [];
      }),
    );
    const crowdedDirectories = packageSourceRoots.flatMap((directory) =>
      listSourceDirectories(directory).flatMap((sourceDirectory) => {
        const fileCount = readdirSync(sourceDirectory, { withFileTypes: true }).filter((entry) =>
          entry.isFile(),
        ).length;
        return fileCount > 80 ? [`${sourceDirectory}: ${fileCount} files`] : [];
      }),
    );

    expect(oversizedFiles).toEqual([]);
    expect(crowdedDirectories).toEqual([]);
  });
});

/** Checks whether an implementation module has a same-name colocated test. */
function existsTestFor(filePath: string): boolean {
  return existsSync(filePath.replace(/\.ts$/, '.test.ts'));
}
