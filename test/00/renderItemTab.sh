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

cp $here/examples/*.mky $here/test/testEq.mky $here/test/test1argBinaryDisplays.mky .
for i in *.mky; do
    echo $i
    # excluded because of random data 
    if [ "$i" = indexing.mky ]; then continue; fi
    if [ "$i" = importedCSV.mky ]; then continue; fi
    $here/gui-tk/minsky $here/test/renderItemTab.tcl $i
    for j in parameters variables; do
        $here/test/compareSVG.sh $i-$j.svg $here/test/renderedEquations/$i-$j.svg
        if [ $? -ne 0 ]; then fail; fi
    done
done

pass
