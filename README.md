# phpfmt for Visual Studio Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/kokororin.vscode-phpfmt)](https://marketplace.visualstudio.com/items?itemName=kokororin.vscode-phpfmt)
[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/i/kokororin.vscode-phpfmt)](https://marketplace.visualstudio.com/items?itemName=kokororin.vscode-phpfmt)

The missing phpfmt extension for Visual Studio Code.

## Installation

Open command palette `F1` and select `Extensions: Install Extension`, then search for phpfmt.

**Note**: PHP 5.6 or newer is required in the machine to run this plugin.


## Usage

`F1` -> `phpfmt: Format This File`

or keyboard shortcut `Ctrl + Shift + I` which is Visual Studio Code default formatter shortcut

or right mouse context menu `Format Document` or `Format Selection`

### Format On Save

Respects `editor.formatOnSave` setting.

You can turn off format-on-save on a per-language basis by scoping the setting:

```json5
// Set the default
"editor.formatOnSave": false,
// Enable per-language
"[php]": {
  "editor.formatOnSave": true
}
```

## Q&A

Q: How to use `phpfmt.php_bin` with spaces such as `C:\Program Files\php\php.exe` ?  
A: Wrap your path with quotes like:

```json
{
  "phpfmt.php_bin": "\"C:\\Program Files\\php\\php.exe\""
}
```

It is recommended to add the directory of the `php.exe` to the PATH environment variable on Windows.  
If it still not working, refer to [#1](https://github.com/kokororin/vscode-phpfmt/issues/1) and [Stack Overflow Related](https://stackoverflow.com/a/45765854).


Q: How use tabs instead of spaces with PSR2 enabled ?  
A: For [PSR2](https://www.php-fig.org/psr/psr-2/), code MUST use 4 spaces for indenting, not tabs. But if you like PSR2, and do not like 4 spaces for indentation, add following configuration:

```json
{
  "phpfmt.passes": [
    "PSR2KeywordsLowerCase",
    "PSR2LnAfterNamespace",
    "PSR2CurlyOpenNextLine",
    "PSR2ModifierVisibilityStaticOrder",
    "PSR2SingleEmptyLineAndStripClosingTag",
    "ReindentSwitchBlocks"
  ],
  "phpfmt.exclude": [
    "ReindentComments",
    "StripNewlineWithinClassBody"
  ],
  "phpfmt.psr2": false
}
```

Q: Is fmt.phar (phpfmt itself) still maintained ?  
~~A: Since phpfmt has no maintainers, only Serious bugs will be fixed.~~  
A: We now use `fmt.stub.php` from driade's [phpfmt8](https://github.com/driade/phpfmt8) which is very updated.

## Configuration

<!-- Configuration START -->
| Key | Type | Description | Default |
| -------- | ----------- | ----------- | ----------- |
| phpfmt.php_bin | `string` | php executable path | "php" | 
| phpfmt.use_old_phpfmt | `boolean` | use old fmt.phar which supports 5.6 | false | 
| phpfmt.detect_indent | `boolean` | auto detecting indent type and size (will ignore indent_with_space) | false | 
| phpfmt.psr1 | `boolean` | activate PSR1 style | false | 
| phpfmt.psr1_naming | `boolean` | activate PSR1 style - Section 3 and 4.3 - Class and method names case. | false | 
| phpfmt.psr2 | `boolean` | activate PSR2 style | true | 
| phpfmt.wp | `boolean` | activate WP style | false | 
| phpfmt.indent_with_space | `integer \| boolean` | use spaces instead of tabs for indentation. Default 4 | 4 | 
| phpfmt.enable_auto_align | `boolean` | enable auto align of ST_EQUAL and T_DOUBLE_ARROW | false | 
| phpfmt.visibility_order | `boolean` | fixes visibiliy order for method in classes - PSR-2 4.2 | false | 
| phpfmt.ignore | `array` | ignore file names whose names contain any pattern that could be matched with `.match` JS string method | [] | 
| phpfmt.passes | `array` | call specific compiler pass | [] | 
| phpfmt.exclude | `array` | disable specific passes | [] | 
| phpfmt.smart_linebreak_after_curly | `boolean` | convert multistatement blocks into multiline blocks | false | 
| phpfmt.yoda | `boolean` | yoda-style comparisons | false | 
| phpfmt.cakephp | `boolean` | Apply CakePHP coding style | false | 
| phpfmt.custom_arguments | `string` | provide custom arguments to overwrite default arguments generated by config | "" | 

<!-- Configuration END -->

## Supported Transformations

`F1` -> `phpfmt: List Transformations` to get the example of each
transformation.

<!-- Transformations START -->
| Key | Description |
| -------- | ----------- |
| SmartLnAfterCurlyOpen | Add line break when implicit curly block is added. |
| AddMissingParentheses | Add extra parentheses in new instantiations. |
| AliasToMaster | Replace function aliases to their masters - only basic syntax alias. |
| AlignConstVisibilityEquals | Vertically align "=" of visibility and const blocks. |
| AlignDoubleArrow | Vertically align T_DOUBLE_ARROW (=>). |
| AlignDoubleSlashComments | Vertically align "//" comments. |
| AlignEquals | Vertically align "=". |
| AlignGroupDoubleArrow | Vertically align T_DOUBLE_ARROW (=>) by line groups. |
| AlignPHPCode | Align PHP code within HTML block. |
| AlignTypehint | Vertically align function type hints. |
| AllmanStyleBraces | Transform all curly braces into Allman-style. |
| AutoPreincrement | Automatically convert postincrement to preincrement. |
| AutoSemicolon | Add semicolons in statements ends. |
| CakePHPStyle | Applies CakePHP Coding Style |
| ClassToSelf | "self" is preferred within class, trait or interface. |
| ClassToStatic | "static" is preferred within class, trait or interface. |
| ConvertOpenTagWithEcho | Convert from "<?=" to "<?php echo ". |
| DocBlockToComment | Replace docblocks with regular comments when used in non structural elements. |
| DoubleToSingleQuote | Convert from double to single quotes. |
| EchoToPrint | Convert from T_ECHO to print. |
| EncapsulateNamespaces | Encapsulate namespaces with curly braces |
| GeneratePHPDoc | Automatically generates PHPDoc blocks |
| IndentTernaryConditions | Applies indentation to ternary conditions. |
| JoinToImplode | Replace implode() alias (join() -> implode()). |
| LeftWordWrap | Word wrap at 80 columns - left justify. |
| LongArray | Convert short to long arrays. |
| MergeElseIf | Merge if with else. |
| SplitElseIf | Merge if with else. |
| MergeNamespaceWithOpenTag | Ensure there is no more than one linebreak before namespace |
| MildAutoPreincrement | Automatically convert postincrement to preincrement. (Deprecated pass. Use AutoPreincrement instead). |
| NewLineBeforeReturn | Add an empty line before T_RETURN. |
| OrganizeClass | Organize class, interface and trait structure. |
| OrderAndRemoveUseClauses | Order use block and remove unused imports. |
| OnlyOrderUseClauses | Order use block - do not remove unused imports. |
| OrderMethod | Organize class, interface and trait structure. |
| OrderMethodAndVisibility | Organize class, interface and trait structure. |
| PHPDocTypesToFunctionTypehint | Read variable types from PHPDoc blocks and add them in function signatures. |
| PrettyPrintDocBlocks | Prettify Doc Blocks |
| PSR2EmptyFunction | Merges in the same line of function header the body of empty functions. |
| PSR2MultilineFunctionParams | Break function parameters into multiple lines. |
| ReindentAndAlignObjOps | Align object operators. |
| ReindentSwitchBlocks | Reindent one level deeper the content of switch blocks. |
| ReindentEnumBlocks | Reindent one level deeper the content of enum blocks. |
| RemoveIncludeParentheses | Remove parentheses from include declarations. |
| RemoveSemicolonAfterCurly | Remove semicolon after closing curly brace. |
| RemoveUseLeadingSlash | Remove leading slash in T_USE imports. |
| ReplaceBooleanAndOr | Convert from "and"/"or" to "&&"/"||". Danger! This pass leads to behavior change. |
| ReplaceIsNull | Replace is_null($a) with null === $a. |
| RestoreComments | Revert any formatting of comments content. |
| ReturnNull | Simplify empty returns. |
| ShortArray | Convert old array into new array. (array() -> []) |
| SortUseNameSpace | Organize use clauses by length and alphabetic order. |
| SpaceAroundControlStructures | Add space around control structures. |
| SpaceAroundExclamationMark | Add spaces around exclamation mark. |
| SpaceBetweenMethods | Put space between methods. |
| StrictBehavior | Activate strict option in array_search, base64_decode, in_array, array_keys, mb_detect_encoding. Danger! This pass leads to behavior change. |
| StrictComparison | All comparisons are converted to strict. Danger! This pass leads to behavior change. |
| StripExtraCommaInArray | Remove trailing commas within array blocks |
| StripNewlineAfterClassOpen | Strip empty lines after class opening curly brace. |
| StripNewlineAfterCurlyOpen | Strip empty lines after opening curly brace. |
| StripNewlineWithinClassBody | Strip empty lines after class opening curly brace. |
| StripSpaces | Remove all empty spaces |
| StripSpaceWithinControlStructures | Strip empty lines within control structures. |
| TightConcat | Ensure string concatenation does not have spaces, except when close to numbers. |
| TrimSpaceBeforeSemicolon | Remove empty lines before semi-colon. |
| UpgradeToPreg | Upgrade ereg_* calls to preg_* |
| WordWrap | Word wrap at 80 columns. |
| WrongConstructorName | Update old constructor names into new ones. http://php.net/manual/en/language.oop5.decon.php |
| YodaComparisons | Execute Yoda Comparisons. |
| SpaceAfterExclamationMark | Add space after exclamation mark. |
| SpaceAroundParentheses | Add spaces inside parentheses. |
<!-- Transformations END -->

## Contribute

### Running extension

- Open this repository inside Visual Studio Code
- Debug sidebar
- `Launch Extension`

### Running tests

- Open this repository inside Visual Studio Code
- Debug sidebar
- `Launch Tests`
