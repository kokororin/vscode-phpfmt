export interface PHPFmtConfig {
  php_bin: string;
  format_on_save: boolean;
  psr1: boolean;
  psr1_naming: boolean;
  psr2: boolean;
  indent_with_space: number;
  enable_auto_align: boolean;
  visibility_order: boolean;
  passes: Array<string>;
  smart_linebreak_after_curly: boolean;
  yoda: boolean;
}
