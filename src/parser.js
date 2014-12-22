/**
 * Glayzzle : the PHP engine on NodeJS
 *
 * Copyright (C) 2014 Glayzzle
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * @url http://glayzzle.com
 * @license GNU-2
 */

var fs = require('fs');

/**
 * Expose the parser constructor
 */
module.exports = function(engine) {

  var tokens = engine.tokens.names;
  var names = engine.tokens.values;
  var EOF = engine.lexer.EOF;

  // check if argument is a number
  function isNumber(n) {
    return n != '.' && n != ',' && !isNaN(parseFloat(n)) && isFinite(n);
  }

  // private helper : gets a token name
  function getTokenName(token) {
    if (!isNumber(token)) {
      return "'" + token + "'";
    } else {
      if (token == 1) return 'the end of file (EOF)';
      return names[token];
    }
  }

  /**
   * The basic parser api
   */
  var api = {
    // le lexer
    lexer: engine.lexer,
    token: null,
    entries: {
      'T_SCALAR': [
          tokens.T_CONSTANT_ENCAPSED_STRING,
          tokens.T_START_HEREDOC,
          tokens.T_LNUMBER,
          tokens.T_DNUMBER,
          tokens.T_STRING,
          tokens.T_ARRAY,'[',
          tokens.T_CLASS_C,
          tokens.T_TRAIT_C,
          tokens.T_FUNC_C,
          tokens.T_METHOD_C,
          tokens.T_LINE,
          tokens.T_FILE,
          tokens.T_DIR,
          tokens.T_NS_C
      ],
      'T_MAGIC_CONST': [
          tokens.T_CLASS_C,
          tokens.T_TRAIT_C,
          tokens.T_FUNC_C,
          tokens.T_METHOD_C,
          tokens.T_LINE,
          tokens.T_FILE,
          tokens.T_DIR,
          tokens.T_NS_C
      ],
      'T_MEMBER_FLAGS': [
        tokens.T_PUBLIC,
        tokens.T_PRIVATE,
        tokens.T_PROTECTED,
        tokens.T_STATIC,
        tokens.T_ABSTRACT,
        tokens.T_FINAL
      ]
    }
    /** main entry point : converts a source code to AST **/
    ,parse: function(code) {
      this.lexer.setInput(code);
      this.token = this.lexer.lex() || EOF;
      var ast = [];
      while(this.token != EOF) {
        ast.push(this.read_start());
      }
      return ast;
    }
    /** handling errors **/
    ,error: function(expect) {
      token = getTokenName(this.token);
      var msgExpect = '';
      if (expect) {
        msgExpect = ', expecting ';
        if (Array.isArray(expect)) {
          for(var i = 0; i < expect.length; i++) {
            expect[i] = getTokenName(expect[i]);
          }
          msgExpect += expect.join(', ');
        } else {
          msgExpect += getTokenName(expect);
        }
      }
      throw new Error(
        'Parse Error : unexpected ' + token + msgExpect,
        '\nat line ' + this.lexer.yylloc.first_line
      );
    }
    /** outputs some debug information on current token **/
    ,debug: function() {
      console.log(
        'Line ' 
        + this.lexer.yylloc.first_line
        + ' : '
        + getTokenName(this.token)
      );
      return this;
    }
    /** force to expect specified token **/
    ,expect: function(token) {
      if (Array.isArray(token)) {
        if (token.indexOf(this.token) === -1) {
          this.error(token);
        }
      } else if (this.token != token) {
        this.error(token);
      }
      return this;
    }
    /**returns the current token contents **/
    ,text: function() {
      return this.lexer.yytext;
    }
    /** consume the next token **/
    ,next: function() {
      this.token = this.lexer.lex() || EOF;
      return this;
    }
    /**
     * Check if token is of specified type
     */
    ,is: function(type) {
      return this.entries[type].indexOf(this.token) != -1;
    }
    /** convert an token to ast **/
    ,read_token: function() {
      var result = this.token;
      if (isNumber(result)) {
        result = [result, this.text(), this.lexer.yylloc.first_line];
      }
      this.next();
      return result;
    }
    /**
     * Helper : reads a list of tokens / sample : T_STRING ',' T_STRING ...
     * <ebnf>
     * list ::= separator? ( item separator )* item
     * </ebnf>
     */
    ,read_list: function(item, separator) {
      var result = [];

      // trim first separator (@fixme not sure ?)
      if (this.token == separator) this.next();

      if (typeof (item) === "function") {
        do {
          result.push(item.apply(this, []));
          if (this.token != separator) {
            break;
          }
        } while(this.next().token != EOF);
      } else {
        result.push(this.expect(item).text());
        while (this.next().token != EOF) {
          if (this.token != separator) break;
          // trim current separator & check item
          if (this.next().token != item) break;
          result.push(this.text());
        }
      }
      return result;
    }
  };
  
  // extends the parser with syntax files
  fs.readdirSync(__dirname + '/parser').forEach(function(file) {
    if (file.indexOf('.js', file.length - 3) !== -1) {
      var ext = require(__dirname + '/parser/' + file)(api, tokens, EOF);
      for(var k in ext) {
        api[k] = ext[k];
      }
    }
  });
  
  return api;
};