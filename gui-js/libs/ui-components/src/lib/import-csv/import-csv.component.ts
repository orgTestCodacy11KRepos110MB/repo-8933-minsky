import { AfterViewInit, Component, ChangeDetectorRef, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ElectronService } from '@minsky/core';
import {
  dateTimeFormats,
  importCSVvariableName,
  VariableBase,
  VariableValue,
} from '@minsky/shared';
import { MessageBoxSyncOptions } from 'electron/renderer';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';

enum ColType {
  axis="axis",
  data="data",
  ignore="ignore"
};

function separatorToChar(sep: string): string {
  switch(sep) {
  case 'space': return ' ';
  case 'tab': return '\t';
  default: return sep;
  }
}

function separatorFromChar(sep: string): string {
  switch(sep) {
  case ' ': return 'space';
  case '\t': return 'tab';
  default: return sep;
  }
}

class Dimension
{
  type: string;
  units: string;
};

@AutoUnsubscribe()
@Component({
  selector: 'minsky-import-csv',
  templateUrl: './import-csv.component.html',
  styleUrls: ['./import-csv.component.scss'],
})
export class ImportCsvComponent implements OnInit, AfterViewInit, OnDestroy {
  form: FormGroup;

  itemId: string;
  systemWindowId: number;
  isInvokedUsingToolbar: boolean;
  valueId: string;
  variableValuesSubCommand: VariableValue;
  timeFormatStrings = dateTimeFormats;
  parsedLines: string[][] = [];
  csvCols: any[];
  colType: Array<ColType> = [];
  selected: boolean[]; ///< per column whether column is selected
  mouseDown=-1;       ///< record of column of previous mouseDown
  dialogState: any;
  @ViewChild('checkboxRow') checkboxRow: ElementRef<HTMLCollection>;
  @ViewChild('importCsvCanvasContainer') inputCsvCanvasContainer: ElementRef<HTMLElement>;

  public get url(): AbstractControl {
    return this.form.get('url');
  }
  public get columnar(): AbstractControl {
    return this.form.get('columnar');
  }
  public get separator(): AbstractControl {
    return this.form.get('separator');
  }
  public get decSeparator(): AbstractControl {
    return this.form.get('decSeparator');
  }
  public get escape(): AbstractControl {
    return this.form.get('escape');
  }
  public get quote(): AbstractControl {
    return this.form.get('quote');
  }
  public get mergeDelimiters(): AbstractControl {
    return this.form.get('mergeDelimiters');
  }
  public get missingValue(): AbstractControl {
    return this.form.get('missingValue');
  }
  public get duplicateKeyAction(): AbstractControl {
    return this.form.get('duplicateKeyAction');
  }
  public get horizontalDimName(): AbstractControl {
    return this.form.get('horizontalDimName');
  }
  public get horizontalDimension(): AbstractControl {
    return this.form.get('horizontalDimension');
  }
  public get type(): AbstractControl {
    return this.horizontalDimension.get('type');
  }
  public get format(): AbstractControl {
    return this.horizontalDimension.get('units');
  }

  constructor(
    private electronService: ElectronService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.route.queryParams.subscribe((params) => {
      this.itemId = params.itemId;
      this.systemWindowId = params.systemWindowId;
      this.isInvokedUsingToolbar = params.isInvokedUsingToolbar;
    });

    this.form = new FormGroup({
      columnar: new FormControl(false),
      decSeparator: new FormControl('.'),
      duplicateKeyAction: new FormControl('throwException'),
      escape: new FormControl(''),
      horizontalDimName: new FormControl('?'),
      mergeDelimiters: new FormControl(false),
      missingValue: new FormControl(NaN),
      quote: new FormControl('"'),
      separator: new FormControl(','),

      // review
      url: new FormControl(''),
      horizontalDimension: new FormGroup({
        type: new FormControl('string'),
        units: new FormControl(''),
      }),
    });
  }

  ngOnInit() {
    // ??
    this.form.valueChanges.subscribe(async (_form) => {
      if (this.url === _form.url) {
        await this.parseLines();
      }
    });
  }

  ngAfterViewInit() {
    (async () => {
      this.valueId = await this.getValueId();
      this.variableValuesSubCommand = this.electronService.minsky.variableValues.elem(this.valueId).second;
      
      
      await this.getCSVDialogSpec();
      this.updateForm();
      this.load();
      this.selectRowAndCol(this.dialogState.spec.dataRowOffset, this.dialogState.spec.dataColOffset);
    })();
  }
  ngAfterViewChecked() 	{
    // set state of dimension controls to reflect dialogState
    if (this.inputCsvCanvasContainer)
    {
      var table=this.inputCsvCanvasContainer.nativeElement.children[0] as HTMLTableElement;
      if (!table) return;
      for (var i=0; i<this.colType.length; ++i)
        {
            var colType=table.rows[0].cells[i+1]?.children[0] as HTMLInputElement;
            if (colType)
                colType.value=this.colType[i];
            if (this.colType[i]===ColType.axis)
            {
              var type=table.rows[1].cells[i+1]?.children[0] as HTMLSelectElement;
              var dimension=this.dialogState.spec.dimensions[i];
              if (!dimension) dimension={type: "string", units: ""};
              type.value=dimension.type;
            }
        }
    }
  }
  
  updateForm() {
    this.url.setValue(this.dialogState.url);
    
    this.columnar.setValue(this.dialogState.spec.columnar);
    this.decSeparator.setValue(this.dialogState.spec.decSeparator);
    this.duplicateKeyAction.setValue(this.dialogState.spec.duplicateKeyAction);
    this.escape.setValue(this.dialogState.spec.escape);
    this.horizontalDimName.setValue(this.dialogState.spec.horizontalDimName);
    this.mergeDelimiters.setValue(this.dialogState.spec.mergeDelimiters);
    this.missingValue.setValue(this.dialogState.spec.missingValue);
    this.quote.setValue(this.dialogState.spec.quote);
    this.separator.setValue(separatorFromChar(this.dialogState.spec.separator));
    this.horizontalDimension.setValue({
      type: this.dialogState.spec.horizontalDimension.type,
      units:this.dialogState.spec.horizontalDimension.units
    });
  }

  async getValueId() {
    return new VariableBase(this.electronService.minsky.namedItems.elem(this.itemId).second).valueId();
  }

  async selectFile() {
    const filePath = await this.electronService.openFileDialog({
      filters: [
        { extensions: ['csv'], name: 'CSV' },
        { extensions: ['*'], name: 'All Files' },
      ],
    });

    if (!filePath) {return;}
    this.url.setValue(filePath);
    this.dialogState.url=filePath;
  }

  async load() {
    const fileUrlOnServer = await this.variableValuesSubCommand.csvDialog.url();
    const fileUrl = this.url.value;

    if (fileUrl !== fileUrlOnServer) {
      await this.variableValuesSubCommand.csvDialog.url(fileUrl);
      await this.variableValuesSubCommand.csvDialog.guessSpecAndLoadFile();
      await this.getCSVDialogSpec();
    } else {
      await this.variableValuesSubCommand.csvDialog.loadFile();
    }

    await this.parseLines();
  }

  async getCSVDialogSpec() {
    this.variableValuesSubCommand.csvDialog.spec.toSchema();
    this.dialogState = await this.variableValuesSubCommand.csvDialog.properties() as Record<string, unknown>;
  }

  async parseLines() {
    this.parsedLines = await this.variableValuesSubCommand.csvDialog.parseLines() as string[][];

    let header=this.dialogState.spec.headerRow;
    this.csvCols = new Array(this.parsedLines[header]?.length);
    this.colType = new Array(this.parsedLines[header]?.length).fill("ignore");
    this.selected = new Array(this.parsedLines[header]?.length).fill(false);
    for (var i in this.dialogState.spec.dimensionCols as Array<number>)
    {
      var col=this.dialogState.spec.dimensionCols[i];
      if (col<this.colType.length)
        this.colType[col]=ColType.axis;
    }
    if (this.dialogState.spec.dataCols)
      for (var i in this.dialogState.spec.dataCols as Array<number>)
    {
      var col=this.dialogState.spec.dataCols[i];
      if (col<this.colType.length)
        this.colType[col]=ColType.data;
    }
    else
      // emulate old behaviour, if no datacols specified, all columns to the right of dataColOffset are data
      for (var ii=this.dialogState.dataColOffset as number; ii<this.colType.length; ++ii)
        this.colType[ii]=ColType.data;
    
  }
  
  async selectHeader(index: number) {
    this.dialogState.spec.headerRow = index;
    // explicitly selecting a header, make sure dataRowOffset is greater
    if (this.dialogState.spec.dataRowOffset<=index)
      this.dialogState.spec.dataRowOffset=index+1;
  }

  async selectRowAndCol(rowIndex: number, colIndex: number) {
    this.dialogState.spec.dataRowOffset = rowIndex;
    if (this.dialogState.spec.headerRow>=rowIndex)
      this.dialogState.spec.headerRow=rowIndex-1;

    
    this.dialogState.spec.dataColOffset = colIndex;

    if (!this.parsedLines.length) return;
    for (let i = 0; i<this.parsedLines[0].length; i++)
      if (i<colIndex) {
        if (this.colType[i]==ColType.data)
          this.colType[i]=ColType.ignore;
      } else if (i===colIndex || !this.columnar.value) 
        this.colType[i]=ColType.data;
      else
        this.colType[i]=ColType.ignore;
    this.ngAfterViewChecked();
  }

  getColorForCell(rowIndex: number, colIndex: number) {
    if (colIndex>=this.colType.length) return "red";

    if (this.dialogState.spec.headerRow === rowIndex)  // header row
        switch (this.colType[colIndex]) {
        case 'data': return "blue";
        case 'axis': return "green";
        case "ignore": return "red";
        }
    else if (this.dialogState.spec.dataRowOffset >= 0 && this.dialogState.spec.dataRowOffset > rowIndex)
      return "red"; // ignore commentary at beginning of file
    else
      switch (this.colType[colIndex]) {
      case 'data': return "black";
      case 'axis': return "blue";
      case "ignore": return "red";
      }
  }

  setColTypeImpl(column: number, type: ColType) {
    this.colType[column]=type;
    if (!this.dialogState.spec.dimensionNames[column])
      this.dialogState.dimensionNames[column]=this.parsedLines[this.dialogState.spec.headerRow][column];
    if (!this.dialogState.spec.dimensions[column])
      this.dialogState.spec.dimensions[column]={type:"string",units:""} as Dimension;
  }
  
  setColType(column: number, type: ColType) {
    if (this.selected.every((x)=>!x)) { // nothing selected
      this.setColTypeImpl(column, type);
      return;
    }
      
    for (let i=0; i<this.selected.length; ++i)
      if (this.selected[i]) {
        this.setColTypeImpl(i, type);
      }
    this.cdr.detectChanges();
  }

  typeMouseDown(col: number) {
    this.mouseDown=col;
  }

  typeMouseMove(col: number) {
    if (this.mouseDown>=0 && col!==this.mouseDown) {
      if (col<this.mouseDown) [col,this.mouseDown]=[this.mouseDown,col];
      for (let i=0; i<this.selected.length; ++i)
        this.selected[i]=i>=this.mouseDown && i<=col;
    }
  }
  
  typeMouseUp(row: number, col: number) {
    this.typeMouseMove(col);
    if (col===this.mouseDown)  // deselect all if ending on same column
      if (this.selected.every((x)=>!x)) 
        this.selectRowAndCol(row, col);
      else
        this.selected.fill(false);
    this.mouseDown=-1;
  }
  
  async handleSubmit() {
    const {
      columnar,
      decSeparator,
      duplicateKeyAction,
      escape,
      horizontalDimName,
      mergeDelimiters,
      missingValue,
      quote,
      separator,
      horizontalDimension,
    } = this.form.value;

    this.dialogState.spec.dimensionCols=[];
    this.dialogState.spec.dataCols=[];
    for (let i=0; i<this.colType.length; ++i) 
      switch (this.colType[i]) {
      case ColType.axis: 
        this.dialogState.spec.dimensionCols.push(i);
        break;
      case ColType.data:
        this.dialogState.spec.dataCols.push(i);
        break;
    }

    const spec = {
      ...this.dialogState.spec,
      columnar,
      decSeparator,
      duplicateKeyAction,
      escape,
      horizontalDimName,
      mergeDelimiters,
      missingValue,
      quote,
      separator: separatorToChar(separator),
      horizontalDimension,
    };

    let v=new VariableBase(this.electronService.minsky.canvas.item);
    // returns an error message on error
    const res = await v.importFromCSV(this.url.value,spec) as unknown as string;

    if (typeof res==='string') {
      const positiveResponseText = 'Yes';
      const negativeResponseText = 'No';

      const options: MessageBoxSyncOptions = {
        buttons: [positiveResponseText, negativeResponseText],
        message: `Something went wrong: ${res}\nDo you want to generate a report?`,
        title: 'Generate Report ?',
      };

      const index = await this.electronService.showMessageBoxSync(options);

      if (options.buttons[index] === positiveResponseText) {
        await this.doReport();
      }
      this.closeWindow();

      return;
    }

    const currentItemId = await v.id();
    const currentItemName = await v.name();

    if (
      this.isInvokedUsingToolbar &&
      currentItemId === this.itemId &&
      currentItemName === importCSVvariableName &&
      this.url.value
    ) {
      const path = this.url.value as string;
      const pathArray = this.electronService.isWindows() ? path.split(`\\`) : path.split(`/`);

      const fileName = pathArray[pathArray.length - 1].split(`.`)[0];

      await this.electronService.minsky.canvas.renameItem(fileName);
    }

    this.closeWindow();
  }

  async doReport() {
    const filePathWithoutExt = (this.url.value as string)
      .toLowerCase()
      .split('.csv')[0];

     const filePath = await this.electronService.saveFileDialog({
      defaultPath: `${filePathWithoutExt}-error-report.csv`,
      title: 'Save report',
      properties: ['showOverwriteConfirmation', 'createDirectory'],
      filters: [{ extensions: ['csv'], name: 'CSV' }],
    });
    if (!filePath) return;

    await this.variableValuesSubCommand.csvDialog.reportFromFile(this.url.value,filePath);
    return;
  }

  closeWindow() {this.electronService.closeWindow();}

  // eslint-disable-next-line @typescript-eslint/no-empty-function,@angular-eslint/no-empty-lifecycle-method
  ngOnDestroy() {}
}
