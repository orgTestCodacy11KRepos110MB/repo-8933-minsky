/*
  @copyright Steve Keen 2019
  @author Russell Standish
  @author Wynand Dednam
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

#ifndef PARAMETERTAB_H
#define PARAMETERTAB_H
#include "itemTab.h"
#include "pannableTab.h"

namespace minsky
{
	 
  class ParameterTab: public PannableTab<ItemTab>
  {
  public:
    // replace definition column by dimensions
    ParameterTab() {assert(varAttrib[1]=="Definition"); varAttrib[1]="Dimensions";}
    bool itemSelector(const ItemPtr& i) override {if (auto v=i->variableCast()) return v->type()==VariableType::parameter; return false;}
    ecolab::Pango& cell(unsigned row, unsigned col) override;
  };
  
}
#include "parameterTab.cd"
#endif
