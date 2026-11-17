/**
 * 形如 `key = value` 或 `key` 的选项
 */
export interface NamedOption {
  type: "option";
  key: string;
  value?: string;
}

/**
 * 形如 `"formula" label label'` 的选项
 */
export interface QuotedOption<Value> {
  type: "quoted";
  value: Value;
  primes: number;
  options: NamedOption[];
}

export type Option<Value> = NamedOption | QuotedOption<Value>;

export type OptionToken<Value> = string | { value: Value };

export class OptionsSyntaxError extends SyntaxError {
  readonly quoted: boolean;

  constructor(message: string, quoted = false) {
    super(message);
    this.quoted = quoted;
  }
}

export function parseOptions(source: string): Option<string>[];
export function parseOptions<Value>(source: Iterable<OptionToken<Value>>): Option<Value>[];
export function parseOptions<Value>(source: string | Iterable<OptionToken<Value>>): Option<Value | string>[] {
  const iterator = (typeof source === "string" ? tokenize(source) : source)[Symbol.iterator]();
  let current = iterator.next();

  const advance = () => {
    current = iterator.next();
  };

  // 跳过空白
  const spaces = () => {
    while (!current.done && typeof current.value === "string" && /^\s+$/.test(current.value)) advance();
  };

  const fail = (expected: string, quoted = false): never => {
    throw new OptionsSyntaxError("Expected " + expected, quoted);
  };

  const named = (end: "]" | "}"): NamedOption | undefined => {
    let text = "";
    while (!current.done && current.value !== "," && current.value !== end) {
      const token = current.value;
      if (typeof token !== "string" || ["{", "}", "]"].includes(token)) {
        fail(end === "}" ? "}" : ", or ]", end === "}");
      }
      text += token;
      advance();
    }
    if (current.done) fail(end, end === "}");
    text = text.trim();
    if (!text) return;
    const assignment = /^([^=]+)\s*=\s*([\s\S]*)$/.exec(text);
    if (assignment) {
      return {
        type: "option",
        key: assignment[1]!.trim(),
        value: assignment[2]!.trim()
      }
    }
    else {
      return {
        type: "option",
        key: text
      }
    }
  };

  const quoted = (value: Value | string): QuotedOption<Value | string> => {
    const node: QuotedOption<Value | string> = { type: "quoted", value, primes: 0, options: [] };
    advance();
    spaces();
    while (!current.done && current.value === "'") {
      node.primes++;
      advance();
    }
    spaces();
    if (current.value === "{") {
      advance();
      while (true) {
        const option = named("}");
        if (option) node.options.push(option);
        if (current.value === "}") {
          advance();
          break;
        }
        advance(); // 逗号
      }
    } else if (current.value !== "," && current.value !== "]") {
      const option = named("]");
      if (option) node.options.push(option);
    }
    return node;
  };

  spaces();
  if (current.value !== "[") fail("[");
  advance();
  const options: Option<Value | string>[] = [];
  while (true) {
    spaces();
    if (current.done) fail("]");
    if (typeof current.value === "object") {
      options.push(quoted(current.value.value));
    } else {
      const option = named("]");
      if (option) options.push(option);
    }
    spaces();
    if (current.value === "]") {
      if (typeof source === "string") {
        advance();
        spaces();
        if (!current.done) fail("end of input");
      }
      return options;
    }
    if (current.value !== ",") fail(", or ]");
    advance();
  }
}

function* tokenize(source: string): Generator<OptionToken<string>> {
  for (let index = 0; index < source.length; index++) {
    if (source[index] !== '"') {
      yield source[index]!;
      continue;
    }
    let value = "", depth = 0;
    let closed = false;
    while (++index < source.length) {
      const character = source[index]!;
      if (character === '"' && depth === 0) {
        closed = true;
        break;
      }
      if (character === "\\" && index + 1 < source.length) {
        value += character + source[++index];
        continue;
      }
      if (character === "{") depth++;
      if (character === "}") depth--;
      value += character;
    }
    if (!closed) throw new OptionsSyntaxError('Expected "');
    yield { value };
  }
}
