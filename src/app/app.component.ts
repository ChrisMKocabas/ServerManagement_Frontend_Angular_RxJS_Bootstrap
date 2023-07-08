import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ServerService } from './service/server.service';
import { BehaviorSubject, Observable, catchError, findIndex, map, of, startWith } from 'rxjs';
import { CustomResponse } from './interface/custom-response';
import { AppState } from './interface/app-state';
import { DataState } from './enum/data-state.enum';
import { Status } from './enum/status.enum';
import { NgForm } from '@angular/forms';
import { Server } from './interface/server';
import { NotificationModule } from './notification-module';
import { NotifierService } from 'angular-notifier';
import { NotificationService } from './service/notification.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class AppComponent implements OnInit{
[x: string]: any;
  title = 'serverapp';
  appState$: Observable<AppState<CustomResponse | undefined>> | undefined;

  readonly DataState = DataState;
  readonly Status = Status;
  private filterSubject = new BehaviorSubject<string>('');
  private dataSubject = new BehaviorSubject<CustomResponse | null>(null);
  private isLoading = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoading.asObservable();
  private readonly notifier: NotifierService;

  readonly imagepath = 'http://localhost:8080/server/image/'

  filterStatus$ = this.filterSubject.asObservable();

  constructor(private serverService: ServerService, private notifierService:NotifierService, private customNotifier : NotificationService) {
    this.notifier = notifierService;

  }

  ngOnInit(): void {
    this.appState$ = this.serverService.servers$()
    .pipe(
      map(response=>{
        this.dataSubject.next(response);
        this.customNotifier.onDefault(response.message)
        return { dataState: DataState.LOADED_STATE, appData: {...response,data: {servers:response.data.servers?.reverse()}}}
      }),
      startWith({dataState: DataState.LOADING_STATE}),
      catchError((error:string) => {
        this.customNotifier.onError(error)
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  };

  pingServer(ipAddress: string): void {
    this.filterSubject.next(ipAddress);
    this.appState$ = this.serverService.ping$(ipAddress)
    .pipe(
      map(response => {
        const dataSubjectValue = this.dataSubject.value;
        if (dataSubjectValue?.data?.servers && response.data.server !== undefined) {
          const serverIndex = dataSubjectValue.data.servers.findIndex(
            (server) => server.id === response.data.server?.id
          );
          if (serverIndex !== -1) {
            dataSubjectValue.data.servers[serverIndex] = response.data.server;
            this.customNotifier.onDefault(response.message)
          }
        }
        this.filterSubject.next('');
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value } as AppState<
          CustomResponse
        >;
      }),
      startWith({
        dataState: DataState.LOADED_STATE,
        appData: this.dataSubject.value,
      } as AppState<CustomResponse>),
      catchError((error: string) => {
        this.filterSubject.next('');
        this.customNotifier.onError(error)
        return of({ dataState: DataState.ERROR_STATE, error } as AppState<
          CustomResponse
        >);
      })
    );
  }

  saveServer(serverForm: NgForm): void {
    this.isLoading.next(true);
    this.appState$ = this.serverService.save$(<Server>serverForm.value)
    .pipe(
      map(response => {
        this.dataSubject.next(
          {...response,data:{servers:[response.data.server!, ...this.dataSubject.value?.data.servers!]}}
        );
        this.customNotifier.onDefault(response.message)
        const closeModalButton = document.getElementById('closeModal');
        if (closeModalButton !== null) {
          closeModalButton.click();
        }
        this.isLoading.next(false);
        serverForm.resetForm({status:this.Status.SERVER_DOWN});
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value } as AppState<
          CustomResponse
        >;
      }),
      startWith({
        dataState: DataState.LOADED_STATE,
        appData: this.dataSubject.value,
      } as AppState<CustomResponse>),
      catchError((error: string) => {
        this.isLoading.next(false);
        this.customNotifier.onError(error)
        return of({ dataState: DataState.ERROR_STATE, error } as AppState<
          CustomResponse
        >);
      })
    );
  }

  filterServers(status:string): void {
    const selectedStatus: Status = Status[status as keyof typeof Status];
    this.appState$ = this.serverService.filter$(selectedStatus,this.dataSubject.value!)
    .pipe(
      map(response => {
        this.customNotifier.onDefault(response.message)
        return { dataState: DataState.LOADED_STATE, appData: response }
      }),
      startWith({
        dataState: DataState.LOADED_STATE,
        appData: this.dataSubject.value,
      } as AppState<CustomResponse>),
      catchError((error: string) => {
        this.customNotifier.onError(error)
        return of({ dataState: DataState.ERROR_STATE, error } );
      })
    );
  }

  deleteServer(server: Server): void {
    this.appState$ = this.serverService.delete$(server.id)
    .pipe(
      map(response => {
       this.dataSubject.next(
        {...response,
        data:{servers:
          this.dataSubject.value!.data.servers!.filter(s => s.id !== server.id)
        }
        }
       )
       this.customNotifier.onDefault(response.message)
        return { dataState: DataState.LOADED_STATE, appData: this.dataSubject.value } as AppState<
          CustomResponse
        >;
      }),
      startWith({
        dataState: DataState.LOADED_STATE,
        appData: this.dataSubject.value,
      } as AppState<CustomResponse>),
      catchError((error: string) => {
        this.filterSubject.next('');
        this.customNotifier.onError(error)
        return of({ dataState: DataState.ERROR_STATE, error } as AppState<
          CustomResponse
        >);
      })
    );
  }


  printReport():void {
    this.customNotifier.onDefault('Report downloaded.')
    // window.print();

    let dataType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
    let tableSelect = document.getElementById('servers');
    let tableHtml = tableSelect?.outerHTML.replace(/ /g, '%20');
    let downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);
    downloadLink.href = 'data: ' + dataType + ', ' + tableHtml;
    downloadLink.download = 'server-report.xls';
    downloadLink.click();
    document.body.removeChild(downloadLink);

  }


}
