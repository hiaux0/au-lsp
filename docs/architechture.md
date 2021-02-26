```ts
interface ComponentMap {
    /** in kebab-case */
    componentName: string;

    // View Model
    viewModelFilePath: string;
    sourceFile: ts.SourceFile
    /** Used for Completions in own View */
    classMembers: any;
    /** Used for Completions in other View */
    bindables: any;

    // View
    viewFilePath: string;
    regions: Region[]
}
```