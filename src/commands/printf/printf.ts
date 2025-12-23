import { Command, CommandContext, ExecResult } from '../../types.js';
import { hasHelpFlag, showHelp } from '../help.js';

const printfHelp = {
  name: 'printf',
  summary: 'format and print data',
  usage: 'printf FORMAT [ARGUMENT...]',
  options: [
    '    --help     display this help and exit',
  ],
  notes: [
    'FORMAT controls the output like in C printf.',
    'Escape sequences: \\n (newline), \\t (tab), \\\\ (backslash)',
    'Format specifiers: %s (string), %d (integer), %% (literal %)',
  ],
};

export const printfCommand: Command = {
  name: 'printf',

  async execute(args: string[], _ctx: CommandContext): Promise<ExecResult> {
    if (hasHelpFlag(args)) {
      return showHelp(printfHelp);
    }

    if (args.length === 0) {
      return { stdout: '', stderr: 'printf: usage: printf format [arguments]\n', exitCode: 1 };
    }

    const format = args[0];
    const formatArgs = args.slice(1);

    let output = '';
    let argIndex = 0;
    let i = 0;

    while (i < format.length) {
      if (format[i] === '\\' && i + 1 < format.length) {
        // Handle escape sequences
        const next = format[i + 1];
        switch (next) {
          case 'n':
            output += '\n';
            i += 2;
            break;
          case 't':
            output += '\t';
            i += 2;
            break;
          case 'r':
            output += '\r';
            i += 2;
            break;
          case '\\':
            output += '\\';
            i += 2;
            break;
          case 'a':
            output += '\x07';
            i += 2;
            break;
          case 'b':
            output += '\b';
            i += 2;
            break;
          case 'f':
            output += '\f';
            i += 2;
            break;
          case 'v':
            output += '\v';
            i += 2;
            break;
          default:
            output += format[i];
            i++;
        }
      } else if (format[i] === '%' && i + 1 < format.length) {
        // Handle format specifiers
        const spec = format[i + 1];
        if (spec === 's') {
          output += formatArgs[argIndex] || '';
          argIndex++;
          i += 2;
        } else if (spec === 'd' || spec === 'i') {
          const val = parseInt(formatArgs[argIndex] || '0', 10);
          output += isNaN(val) ? '0' : String(val);
          argIndex++;
          i += 2;
        } else if (spec === '%') {
          output += '%';
          i += 2;
        } else {
          // Unknown specifier, output as-is
          output += format[i];
          i++;
        }
      } else {
        output += format[i];
        i++;
      }
    }

    return { stdout: output, stderr: '', exitCode: 0 };
  },
};
