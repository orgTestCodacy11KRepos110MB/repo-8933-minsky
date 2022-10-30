import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ElectronService } from '@minsky/core';
import { ClassType, OperationBase } from '@minsky/shared';

@Component({
  selector: 'minsky-edit-operation',
  templateUrl: './edit-operation.component.html',
  styleUrls: ['./edit-operation.component.scss'],
})
export class EditOperationComponent implements OnInit {
  form: FormGroup;

  classType: ClassType;
  itemType: string;
  op: OperationBase;

  public get axis(): AbstractControl {
    return this.form.get('axis');
  }
  public get argument(): AbstractControl {
    return this.form.get('argument');
  }
  public get rotation(): AbstractControl {
    return this.form.get('rotation');
  }

  constructor(
    private electronService: ElectronService,
    private route: ActivatedRoute
  ) {
    this.form = new FormGroup({
      axis: new FormControl(''),
      argument: new FormControl(null),
      rotation: new FormControl(0),
    });
    this.route.queryParams.subscribe((params) => {
      this.classType = params.classType;
    });
    this.op=new OperationBase(this.electronService.minsky.canvas.item);
  }

  ngOnInit() {
    if (this.electronService.isElectron) {
      (async () => {
        await this.updateFormValues();
      })();
    }
  }

  private async updateFormValues() {
    this.itemType = await this.op.type();
    this.rotation.setValue(await this.op.rotation());
    this.axis.setValue(await this.op.axis());
    this.argument.setValue(await this.op.arg());
  }

  async handleSave() {
    if (this.electronService.isElectron) {
      this.op.rotation(this.rotation.value);
      this.op.axis(this.axis.value);
      this.op.arg(this.argument.value);
    }

    this.closeWindow();
  }

  closeWindow() {
    if (this.electronService.isElectron) {
      this.electronService.remote.getCurrentWindow().close();
    }
  }
}
