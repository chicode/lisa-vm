# Lisa VM

An interpreter for [Lisa](https://github.com/chicode/lisa) and Lisa-esque
languages

## Features

- Good error messages: if each AST node has a `location` field, that will be
  returned with each error.
- No exceptions except when by programmer error: e.g. type error, wrong number
  of arguments, undeclared variable. Otherwise, errors are data.

## License

This project is licensed under the GPLv3 license. Please see the
[LICENSE](LICENSE) file for more details.
