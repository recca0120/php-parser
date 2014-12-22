module.exports = function(api, tokens, EOF) {
  return {
    /**
     * checks if current token is a reference keyword
     */
    is_reference: function() {
      if (this.token == '&') {
        this.next();
        return true;
      }
      return false;
    }
    /**
     * reading a function
     * <ebnf>
     * function ::= function_declaration code_block
     * </ebnf>
     */
    ,read_function: function() {
      var result = this.read_function_declaration();
      result.push(this.expect('{').read_code_block(false));
      return result;
    }
    /**
     * reads a function declaration (without his body)
     * <ebnf>
     * function_declaration ::= T_FUNCTION '&'?  T_STRING '(' parameter_list ')'
     * </ebnf>
     */
    ,read_function_declaration: function() {
      this.expect(tokens.T_FUNCTION);
      var isRef = this.next().is_reference();
      var name = this.expect(tokens.T_STRING).text();
      this.next().expect('(').next();
      var params = this.read_parameter_list();
      this.expect(')').next();
      return ['function', name, params, isRef];
    }
    /**
     * reads a list of parameters
     * <ebnf>
     *  parameter_list ::= (parameter ',')* parameter?
     * </ebnf>
     */
    ,read_parameter_list: function() {
      var result = [];
      if (this.token != ')') {
        while(this.token != EOF) {
          result.push(this.read_parameter());
          if (this.token == ',') {
            this.next();
          } else if (this.token == ')') {
            break;
          } else {
            this.error([',', ')']);
          }
        }
      }
      return result;
    }
    /**
     * <ebnf>
     *  parameter ::= type? '&'? T_VARIABLE ('=' scallar)?
     * </ebnf>
     */
    ,read_parameter: function() {
      var type = this.read_type();
      var isRef = this.is_reference();
      var name = this.expect(tokens.T_VARIABLE).text();
      var value = [];
      if (this.next().token == '=') {
        value = this.next().read_scalar();
      }
      return [name, type, value, isRef];
    }
    /**
     * read type hinting
     * <ebnf>
     *  type ::= T_ARRAY | namespace_name
     * </ebnf>
     */
    ,read_type: function() {
      switch(this.token) {
        case tokens.T_ARRAY:
          this.next();
          return 'array';
        case tokens.T_NS_SEPARATOR:
        case tokens.T_STRING:
          return this.read_namespace_name();
        default:
          return 'mixed';
      }
    }
  };
};