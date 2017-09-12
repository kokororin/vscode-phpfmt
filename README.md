# phpfmt for Visual Studio Code

The missing phpfmt plugin for Visual Studio Code.

## Installation

Open command palette <kbd>F1</kbd> and select `Extensions: Install Extension`, then search for phpfmt.

**Note**: PHP > 7.0 is required.
**Note**: Only test in Linux and Darwin.

## Usage

<kbd>F1</kbd> -> `phpfmt: format this file`

or keyboard shortcut `ctrl+shift+i` which is Visual Studio Code default formatter shortcut

or right mouse context menu `Format Document`

## Configuration

Default configuration is the following
```JSON
{
    "phpfmt.php_bin": "/usr/bin/php",
    "phpfmt.psr1": false,
    "phpfmt.psr2": true,
    "phpfmt.indent_with_space": 4,
    "phpfmt.enable_auto_align": false,
    "phpfmt.visibility_order": false,
    "phpfmt.passes": []
}
```

## License

MIT