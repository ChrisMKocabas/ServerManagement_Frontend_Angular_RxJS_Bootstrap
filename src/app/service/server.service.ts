import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subscriber, catchError, tap, throwError } from 'rxjs';
import { CustomResponse } from '../interface/custom-response';
import { Server } from '../interface/server';
import { Status } from '../enum/status.enum';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Injectable({ providedIn: 'root'})
export class ServerService {
  private readonly apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient,) {}

  servers$ = (limit:number = 30) => {
    const params = new HttpParams().set('limit', limit.toString());
    return <Observable<CustomResponse>>this.http.get<CustomResponse>(`${this.apiUrl}/server/list/`,{params})
  .pipe(
    tap(console.log),
    catchError(this.handleError)
  );
  }

  save$ = (server:Server) => <Observable<CustomResponse>>this.http.post<CustomResponse>(`${this.apiUrl}/server/save`,server)
  .pipe(
    tap(console.log),
    catchError(this.handleError)
  );

  ping$ = (ipAddress: string) => <Observable<CustomResponse>>this.http.get<CustomResponse>(`${this.apiUrl}/server/ping/${ipAddress}`)
  .pipe(
    tap(console.log),
    catchError(this.handleError)
  );

  filter$ = (status: Status, response:CustomResponse) => <Observable<CustomResponse>> new Observable<CustomResponse>(
    Subscriber=>{
      console.log(response);
      Subscriber.next(
        status === Status.ALL ? {...response, message: `Servers filtered by ${status} status`} :
        {
          ...response,
          message: this.serversDefined(response.data.servers).filter(server=> server.status === status).length > 0 ?
          `Servers filtered by ${status === Status.SERVER_UP ? 'SERVER UP' : 'SERVER DOWN'} status` :
          `No servers of ${status} found.`,
          data:{
            servers: this.serversDefined(response.data.servers)
            .filter(server => server.status === status)
          }
        }
      );
      Subscriber.complete();
    }
  )
  .pipe(
    tap(console.log),
    catchError(this.handleError)
  );



  delete$ = (serverId: number) => <Observable<CustomResponse>>this.http.delete<CustomResponse>(`${this.apiUrl}/server/delete/${serverId}`)
  .pipe(
    tap(console.log),
    catchError(this.handleError)
  );

  private handleError(error: HttpErrorResponse):Observable<never>{
    console.log(error);
    return throwError(() => new Error(`An error occured - Error code: ${error.status}`));
  }

  private serversDefined<T>(value: T | undefined | null) : Server[]{
    if (value !== undefined && value !== null) {
      return value as Server[];
    } else {
     return [];
    }
  }
}
