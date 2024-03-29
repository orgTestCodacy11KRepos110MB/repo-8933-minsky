#! /bin/sh

here=`pwd`
if test $? -ne 0; then exit 2; fi
tmp=/tmp/$$
mkdir $tmp
if test $? -ne 0; then exit 2; fi
cd $tmp
if test $? -ne 0; then exit 2; fi

fail()
{
    echo "FAILED" 1>&2
    cd $here
    chmod -R u+w $tmp
    rm -rf $tmp
    exit 1
}

pass()
{
    echo "PASSED" 1>&2
    cd $here
    chmod -R u+w $tmp
    rm -rf $tmp
    exit 0
}

trap "fail" 1 2 3 15

# insert ecolab script code here
# use \$ in place of $ to refer to variable contents
# exit 0 to indicate pass, and exit 1 to indicate failure
cat >input.tcl <<EOF
source $here/test/assert.tcl
minsky.load $here/test/implicitTensorExample.mky
minsky.nSteps 10
minsky.step
minsky.step
assert {[minsky.t]>0}
minsky.load $here/test/derivativeNotDefined.mky
minsky.nSteps 10
assert {[catch minsky.step]}
assert {[catch minsky.step]}
assert {[minsky.t]==0}
tcl_exit
EOF

$here/gui-tk/minsky input.tcl
if test $? -ne 0; then fail; fi

pass
