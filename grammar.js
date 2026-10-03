/**
 * @file Razor grammar for tree-sitter
 * @author Tristan Knight <admin@snappeh.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const CSHARP = require("tree-sitter-c-sharp/grammar").default;

module.exports = grammar(CSHARP, {
  name: "razor",

  extras: ($) => [$.razor_comment, $.comment, /\s+/],

  conflicts: ($, o) => [
    [$.razor_explicit_expression, $._expression_statement_expression],

    [
      $.preproc_if,
      $.preproc_if_in_top_level,
      $.preproc_if_in_expression,
      $.preproc_if_in_attribute_list,
    ],
    [$.preproc_if, $.preproc_if_in_top_level],
    [$.preproc_if, $.preproc_if_in_top_level, $.preproc_if_in_expression],
    [$.preproc_if, $.preproc_if_in_top_level, $.preproc_if_in_attribute_list],
    [
      $.preproc_else,
      $.preproc_else_in_top_level,
      $.preproc_else_in_expression,
      $.preproc_else_in_attribute_list,
    ],
    [$.declaration, $.preproc_if_in_top_level],
    [$.type_declaration, $.declaration],
    [$.method_declaration, $._local_function_declaration],
    [$.declaration, $.preproc_else_in_top_level],
    [
      $.preproc_elif,
      $.preproc_elif_in_top_level,
      $.preproc_elif_in_expression,
      $.preproc_elif_in_attribute_list,
    ],

    [$.destructor_declaration, $._simple_name],

    [$.initializer_expression, $.razor_block],
    [$.field_declaration, $.local_declaration_statement],
    ...o,
  ],

  rules: {
    compilation_unit: ($) =>
      seq(
        optional($._top_level_text),
        repeat(
          choice(
            $.shebang_directive, // this is to make sharing highlights easier
            $.razor_page_directive,
            $.razor_using_directive,
            $.razor_model_directive,
            $.razor_rendermode_directive,
            $.razor_inject_directive,
            $.razor_implements_directive,
            $.razor_layout_directive,
            $.razor_inherits_directive,
            $.razor_attribute_directive,
            $.razor_typeparam_directive,
            $.razor_namespace_directive,
            $.razor_preservewhitespace_directive,
            $.razor_addtaghelper_directive,
            $.razor_removetaghelper_directive,
            $.razor_taghelperprefix_directive,
          ),
        ),
        repeat(
          choice(
            $._node,
            $.razor_block,
            seq(choice($._closed_node, $.razor_block), $._top_level_text),
          ),
        ),
      ),

    // The nodes that text may follow: every `_node` except the implicit and
    // the explicit expression. C# can continue after an expression, and text
    // there would compete with every token of a C# expression. Keep this
    // list in step with `_node`.
    _closed_node: ($) =>
      choice(
        $.razor_escape,
        $.razor_if,
        $.razor_switch,
        $.razor_for,
        $.razor_foreach,
        $.razor_while,
        $.razor_do_while,
        $.razor_try,
        $.explicit_line_transition,
        $.razor_section,
        $.razor_compound_using,
        $.razor_lock,
        $.element,
        alias($._void_element, $.element),
        $.erroneous_end_tag,
        $.doctype,
        $.html_comment,
      ),

    _top_level_text: ($) =>
      repeat1(choice(alias($._text_line, $.text), $.entity)),

    _identifier_token: (_) =>
      token(
        // @ts-ignore
        /(\p{XID_Start}|_|\\u[0-9A-Fa-f]{4}|\\U[0-9A-Fa-f]{8})(\p{XID_Continue}|\\u[0-9A-Fa-f]{4}|\\U[0-9A-Fa-f]{8})*/,
      ),
    identifier: ($) => choice($._identifier_token, $._reserved_identifier),

    _csharp_nodes: ($) =>
      choice(
        $.statement,
        $._node,

        $.preproc_region,
        $.preproc_endregion,
        $.preproc_line,
        $.preproc_pragma,
        $.preproc_nullable,
        $.preproc_error,
        $.preproc_warning,
        $.preproc_define,
        $.preproc_undef,
      ),

    block: ($) => seq("{", repeat($._csharp_nodes), "}"),

    _node: ($) =>
      prec.right(
        choice(
          $.razor_escape,
          $.razor_if,
          $.razor_switch,
          $.razor_for,
          $.razor_foreach,
          $.razor_while,
          $.razor_do_while,
          $.razor_try,
          $.explicit_line_transition,
          $.razor_implicit_expression,
          $.razor_explicit_expression,
          $.razor_section,
          $.razor_compound_using,
          $.razor_lock,
          $.element,
          alias($._void_element, $.element),
          $.erroneous_end_tag,
          $.doctype,
          $.html_comment,
        ),
      ),

    _razor_marker: (_) => token("@"),

    razor_escape: ($) =>
      seq(alias(/@{2}/, "at_at_escape"), alias($._html_text, $.element)),

    razor_page_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "page"), "at_page"),
        optional($.string_literal),
      ),
    razor_using_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "using"), "at_using"),
        choice(
          seq(optional("unsafe"), field("name", $.identifier), "=", $.type),
          seq(optional("static"), optional("unsafe"), $._name),
        ),
      ),
    razor_model_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "model"), "at_model"),
        field("name", $._name),
      ),
    razor_preservewhitespace_directive: ($) =>
      seq(
        alias(
          seq($._razor_marker, "preservewhitespace"),
          "at_preservewhitespace",
        ),
        $.boolean_literal,
      ),
    razor_attribute_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "attribute"), "at_attribute"),
        $.attribute_list,
      ),
    razor_implements_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "implements"), "at_implements"),
        field("name", $._name),
      ),
    razor_layout_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "layout"), "at_layout"),
        field("name", $._name),
      ),
    razor_inherits_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "inherits"), "at_inherits"),
        field("name", $._name),
      ),
    razor_typeparam_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "typeparam"), "at_typeparam"),
        field("name", $._name),
      ),
    razor_inject_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "inject"), "at_inject"),
        $.variable_declaration,
      ),
    razor_namespace_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "namespace"), "at_namespace"),
        $.qualified_name,
      ),
    razor_rendermode_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "rendermode"), "at_rendermode"),
        $.razor_rendermode,
      ),
    razor_rendermode: (_) =>
      choice("InteractiveServer", "InteractiveWebAssembly", "InteractiveAuto"),

    _taghelper_target: ($) =>
      seq(
        choice($.identifier, alias("*", $.taghelper_wildcard)),
        ",",
        field("assembly", $._name),
      ),
    razor_addtaghelper_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "addTagHelper"), "at_addtaghelper"),
        choice($.string_literal, $._taghelper_target),
      ),
    razor_removetaghelper_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "removeTagHelper"), "at_removetaghelper"),
        choice($.string_literal, $._taghelper_target),
      ),
    razor_taghelperprefix_directive: ($) =>
      seq(
        alias(seq($._razor_marker, "tagHelperPrefix"), "at_taghelperprefix"),
        choice($.string_literal, $.identifier),
      ),

    // An empty `@{ }` also reads as an implicit expression with an object
    // initializer. The dynamic precedence makes the block win.
    razor_block: ($) =>
      prec.dynamic(
        1,
        prec.left(
          seq(
            alias(
              seq($._razor_marker, optional(choice("code", "functions"))),
              "at_block",
            ),
            "{",
            repeat(choice($.declaration, seq($.statement), $._node)),
            "}",
          ),
        ),
      ),

    razor_explicit_expression: ($) =>
      prec.right(
        seq(
          alias($._razor_marker, "at_explicit"),
          prec.right($.parenthesized_expression),
        ),
      ),

    // 10 is the precedence of `<` in tree-sitter-c-sharp (PREC.REL). With the
    // same precedence and left associativity the expression ends before a `<`
    // that can start an element, instead of taking it as less-than.
    razor_implicit_expression: ($) =>
      seq(alias($._razor_marker, "at_implicit"), prec.left(10, $.expression)),

    razor_lock: ($) =>
      seq(
        alias(seq($._razor_marker, "lock"), "at_lock"),
        "(",
        $.expression,
        ")",
        "{",
        $._blended_content,
        "}",
      ),

    razor_compound_using: ($) =>
      seq(
        alias(seq($._razor_marker, "using"), "at_using"),
        "(",
        choice(
          alias($.using_variable_declaration, $.variable_declaration),
          $.expression,
        ),
        ")",
        "{",
        $._blended_content,
        "}",
      ),

    razor_if: ($) =>
      seq(
        alias(seq($._razor_marker, "if"), "at_if"),
        $.razor_condition,
        seq("{", $._blended_content, "}"),
        repeat(choice($.razor_else_if, $.razor_else)),
      ),

    razor_try: ($) =>
      prec.right(
        seq(
          alias(seq($._razor_marker, "try"), "at_try"),
          "{",
          $._blended_content,
          "}",
          repeat(choice($.razor_catch, $.razor_finally)),
        ),
      ),

    razor_catch: ($) =>
      seq(
        token(prec(10, "catch")),
        repeat(choice($.catch_declaration, $.catch_filter_clause)),
        "{",
        $._blended_content,
        "}",
      ),

    razor_finally: ($) =>
      seq(
        token(prec(10, "finally")),
        "{",
        $._blended_content,
        "}"
      ),

    razor_else_if: ($) =>
      seq(
        token(prec(10, "else")),
        "if",
        $.razor_condition,
        "{",
        $._blended_content,
        "}"
      ),

    razor_else: ($) =>
      seq(
        token(prec(10, "else")),
        "{",
        $._blended_content,
        "}"
      ),

    razor_switch: ($) =>
      seq(
        alias(seq($._razor_marker, "switch"), "at_switch"),
        $.razor_condition,
        "{",
        repeat(choice($.razor_switch_case, $.razor_switch_default)),
        "}",
      ),

    razor_condition: ($) => prec(10, seq("(", $.expression, ")")),

    razor_switch_case: ($) =>
      prec.left(
        seq(
          "case",
          $.razor_case_condition,
          ":",
          $._blended_content,
          optional("break;"),
        ),
      ),

    razor_switch_default: ($) =>
      prec.right(seq("default", ":", $._blended_content, optional("break;"))),

    razor_case_condition: (_) => /[^:]+/,

    _razor_for_initializer: ($) =>
      seq(
        alias(seq($._razor_marker, "for"), "at_for"),
        "(",
        field(
          "initializer",
          optional(choice($.variable_declaration, $.expression)),
        ),
        ";",
        field("condition", optional($.expression)),
        ";",
        field("update", optional($.expression)),
        ")",
      ),

    razor_for: ($) =>
      seq(
        $._razor_for_initializer,
        "{",
        field("body", $._blended_content),
        "}",
      ),

    _blended_content: ($) =>
      repeat1(
        prec(
          10,
          choice($._node, $.explicit_line_transition, $.statement, $.comment),
        ),
      ),

    _razor_foreach_initializer: ($) =>
      seq(
        alias(seq($._razor_marker, "foreach"), "at_foreach"),
        "(",
        choice(
          seq(
            field("type", $.type),
            field("left", choice($.identifier, $.tuple_pattern)),
          ),
          field("left", $.expression),
        ),
        "in",
        field("right", $.expression),
        ")",
      ),

    razor_foreach: ($) =>
      seq(
        $._razor_foreach_initializer,
        "{",
        field("body", $._blended_content),
        "}",
      ),

    razor_while: ($) =>
      seq(
        alias(seq($._razor_marker, "while"), "at_while"),
        $.razor_condition,
        "{",
        $._blended_content,
        "}",
      ),

    _razor_while_condition: ($) => seq("while", $.razor_condition),

    razor_do_while: ($) =>
      seq(
        alias(seq($._razor_marker, "do"), "at_do"),
        "{",
        $._blended_content,
        "}",
        $._razor_while_condition,
        ";",
      ),

    razor_section: ($) =>
      seq(
        alias(seq($._razor_marker, "section"), "at_section"),
        $.identifier,
        "{",
        $._blended_content,
        "}",
      ),

    explicit_line_transition: ($) =>
      prec.left(
        seq(
          alias("@:", "at_colon_transition"),
          alias(token(prec(1, /[^\n\r]+/)), $.element),
        ),
      ),

    // A single token, valid anywhere as an extra.
    razor_comment: (_) => token(seq("@*", /([^*]|\*+[^*@])*/, /\*+/, "@")),
    _razor_comment_text: (_) => repeat1(/.|\n|\r/),
    razor_attribute_name: ($) =>
      seq(
        $._razor_marker,
        seq(
          choice(
            "attributes",
            "bind",
            "formname",
            token(prec(10, /on[a-z]+/i)),
            "key",
            "ref",
          ),
          optional($.razor_attribute_modifier),
        ),
      ),

    razor_attribute_modifier: (_) =>
      choice(":culture", ":preventDefault", ":stopPropagation"),

    html_comment: ($) => seq("<!--", optional($._razor_comment_text), "-->"),
    _html_comment_text: (_) => repeat1(/.|\n|\r/),

    doctype: (_) =>
      token(seq("<!", /[Dd][Oo][Cc][Tt][Yy][Pp][Ee]/, /[^>]*/, ">")),

    // HTML Base Definitions
    // The void elements have no content and no end tag. This token has to stay
    // above `_tag_name`: both match these names, and of two tokens that match
    // the same text the one defined first wins. A longer name such as
    // `colgroup` still lexes as `_tag_name`, because the longer match wins.
    _void_tag_name: (_) =>
      /area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr/,
    _tag_name: (_) => /[a-zA-Z0-9-:]+/,
    _end_tag: ($) => seq("</", alias($._tag_name, $.tag_name), ">"),
    // An end tag for a void element, as in `<br></br>`, closes nothing.
    erroneous_end_tag: (_) =>
      token(
        seq(
          "</",
          /area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr/,
          /\s*/,
          ">",
        ),
      ),
    _html_attribute_name: (_) => /[a-zA-Z0-9-:]+/,
    _boolean_html_attribute: (_) => /[a-zA-Z0-9-:]+/,
    _html_attribute_value: ($) =>
      seq(
        '"',
        repeat(
          choice(
            $.razor_explicit_expression,
            $.razor_implicit_expression,
            alias(/[^"@]+/, $.attribute_value),
          ),
        ),
        '"',
      ),
    _html_text: (_) => /[^<>&@.(\s]([^<>&@]*[^<>&@\s])?/,
    entity: (_) => /&(#([xX][0-9a-fA-F]{1,6}|[0-9]{1,5})|[A-Za-z]{1,30});?/,
    // `_html_text` cannot start with `.` or `(`, so that `@item.Name` and
    // `@Method()` continue after an expression. This token is the text that
    // does start with one of them. It is only valid where no expression comes
    // before it: at the start of an element and after a `_closed_node` or an
    // entity, as in `</a>.` and `<p>(note)</p>`.
    _text_after_tag: (_) => /[.(]([^<>&@]*[^<>&@\s])?/,
    // Text outside an element, one line at a time. It cannot start with `/`,
    // so a C# comment line at the top level stays a comment. A text token
    // with a lower lexical precedence would be simpler, but it changes which
    // tokens take part in error recovery and makes recovery in markup worse.
    _text_line: (_) => /[^<>&@\/\s]([^<>&@\n\r]*[^<>&@\s])?/,

    razor_attribute_value: ($) =>
      seq('"', optional($.modifier), $.expression, '"'),

    _html_attribute: ($) =>
      seq(
        alias($._html_attribute_name, $.attribute_name),
        "=",
        alias($._html_attribute_value, $.quoted_attribute_value),
      ),

    razor_html_attribute: ($) =>
      seq($.razor_attribute_name, optional(seq("=", $.razor_attribute_value))),

    _html_attributes: ($) =>
      repeat1(
        prec.left(
          seq(
            choice(
              $._html_attribute,
              alias($._boolean_html_attribute, $.attribute_name),
              $.razor_html_attribute,
            ),
            optional(" "),
          ),
        ),
      ),

    element: ($) =>
      seq(
        "<",
        alias($._tag_name, $.tag_name),
        optional($._html_attributes),
        choice(
          "/>",
          seq(
            ">",
            optional(alias($._text_after_tag, $.text)),
            repeat(
              choice(
                $._node,
                alias($._html_text, $.text),
                $.entity,
                seq(
                  choice($._closed_node, $.entity),
                  alias($._text_after_tag, $.text),
                ),
              ),
            ),
            $._end_tag,
          ),
        ),
      ),

    // `@item.Name<br>` also reads as a generic name. The dynamic precedence
    // makes the void element win.
    _void_element: ($) =>
      prec.dynamic(
        1,
        seq(
          "<",
          alias($._void_tag_name, $.tag_name),
          optional($._html_attributes),
          choice(">", "/>"),
        ),
      ),
  },
});
