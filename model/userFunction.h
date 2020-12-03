/*
  @copyright Steve Keen 2020
  @author Russell Standish
  This file is part of Minsky.

  Minsky is free software: you can redistribute it and/or modify it
  under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Minsky is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with Minsky.  If not, see <http://www.gnu.org/licenses/>.
*/

#ifndef USERFUNCTION_H
#define USERFUNCTION_H
#include "operation.h"
#include "exprtk/exprtk.hpp"
namespace  minsky
{
  class UserFunction: public ItemT<UserFunction, Operation<OperationType::userFunction>>, public NamedOp
  {
    exprtk::symbol_table<double> symbolTable;
    exprtk::expression<double> compiledExpression;
    void updateBB() override {bb.update(*this);}
  public:
    static int nextId;
    double x, y, result;
    std::string expression;
    UserFunction() {description("uf"+std::to_string(nextId++)+"(x,y)");}
    void compile();
    double evaluate(double x, double y);
  };
}
#include "userFunction.cd"
#include "userFunction.xcd"
#endif