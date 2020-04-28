/*
  @copyright Steve Keen 2013
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

#include "flowCoef.h"
#include "str.h"
#include <ctype.h>
#include <stdlib.h>
#include <boost/spirit/include/qi.hpp>
namespace qi = boost::spirit::qi;

using namespace std;

namespace
// Extract leading number from a string. See https://stackoverflow.com/questions/45600212/regular-expression-multiple-floating-point.
{
  bool parseLine(std::string const& line, double& num) {
      using It = std::string::const_iterator;
      //qi::rule<It, std::string()> quoted = *~qi::char_(' ') ;
  
      It f = line.begin(), l = line.end();
      //return qi::phrase_parse(f, l, qi::double_ >> quoted, qi::blank, num, name);
      return qi::phrase_parse(f, l, qi::double_, qi::blank, num);
  }	
	
}

namespace minsky
{
  FlowCoef::FlowCoef(const string& formula)
  {
      const char* f=formula.c_str();
      char* tail;
      double fnum;      
      
      // attempt to read leading numerical value
      if (parseLine(f, fnum)) {  	
	       const char* ff=(std::to_string(fnum)).c_str();  
           coef=strtod(ff,&tail);
      } else coef=strtod(f,&tail);
      
      //coef=strtod(f,&tail);
      if (tail==f) // oops, that failed, check if there's a leading - sign
        {
          // skip whitespace
          while (*tail != '\0' && isspace(*tail)) ++tail;
          if (*tail=='\0') 
            {
              coef=0;
              return; // empty cell, nothing to do
            }
          if (*tail=='-') 
            {
              coef=-1; // treat leading - sign as -1
              tail++;
            }
          else
            coef=1;
        }

      name=trimWS(tail);
  }

  string FlowCoef::str() const
  {
    if (name.empty())
      return minsky::str(coef);
    if (coef==1)
      return name;
    else if (coef==-1)
      return "-"+name;
    else
      return minsky::str(coef)+name;
  }

}
