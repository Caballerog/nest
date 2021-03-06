import * as sinon from 'sinon';
import { expect } from 'chai';
import { RpcExceptionsHandler } from './../../exceptions/rpc-exceptions-handler';
import { RpcException } from './../../exceptions/rpc-exception';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/empty';

describe('RpcExceptionsHandler', () => {
    let handler: RpcExceptionsHandler;

    beforeEach(() => {
        handler = new RpcExceptionsHandler();
    });

    describe('handle', () => {
        it('should method returns expected stream with message when exception is unknown', (done) => {
            const stream$ = handler.handle(new Error());
            stream$.catch((err) => {
                expect(err).to.be.eql({ status: 'error', message: 'Internal server error' });
                done();
                return Observable.empty();
            }).subscribe(() => ({}));
        });
        describe('when exception is instance of WsException', () => {
            it('should method emit expected status and json object', (done) => {
                const message = {
                    custom: 'Unauthorized',
                };
                const stream$ = handler.handle(new RpcException(message));
                stream$.catch((err) => {
                    expect(err).to.be.eql(message);
                    done();
                    return Observable.empty();
                }).subscribe(() => ({}));
            });
            it('should method emit expected status and transform message to json', (done) => {
                const message = 'Unauthorized';

                const stream$ = handler.handle(new RpcException(message));
                stream$.catch((err) => {
                    expect(err).to.be.eql({ message, status: 'error' });
                    done();
                    return Observable.empty();
                }).subscribe(() => ({}));
            });
        });
        describe('when "invokeCustomFilters" returns observable', () => {
            const observable$ = Observable.of(true);
            beforeEach(() => {
                sinon.stub(handler, 'invokeCustomFilters').returns(observable$);
            });
            it('should returns observable', () => {
                const result = handler.handle(new RpcException(''));
                expect(result).to.be.eql(observable$);
            });
        });
    });
    describe('setCustomFilters', () => {
        const filters = [ 'test', 'test2' ];
        it('should set custom filters', () => {
            handler.setCustomFilters(filters as any);
            expect((handler as any).filters).to.be.eql(filters);
        });
        it('should throws exception when passed argument is not an array', () => {
            expect(
                () => handler.setCustomFilters(null),
            ).to.throw;
        });
    });
    describe('invokeCustomFilters', () => {
        describe('when filters array is empty', () => {
            it('should returns identity', () => {
                expect(handler.invokeCustomFilters(null)).to.be.null;
            });
        });
        describe('when filters array is not empty', () => {
            let filters, funcSpy;
            class TestException {}

            beforeEach(() => {
                funcSpy = sinon.spy();
            });
            describe('when filter exists in filters array', () => {
                beforeEach(() => {
                    filters = [
                        { exceptionMetatypes: [ TestException ], func: funcSpy },
                    ];
                    (handler as any).filters = filters;
                });
                it('should call funcSpy', () => {
                    handler.invokeCustomFilters(new TestException());
                    expect(funcSpy.notCalled).to.be.false;
                });
                it('should call funcSpy with exception and response passed as an arguments', () => {
                    const exception = new TestException();
                    handler.invokeCustomFilters(exception);
                    expect(funcSpy.calledWith(exception)).to.be.true;
                });
                it('should returns stream', () => {
                    expect(handler.invokeCustomFilters(new TestException())).to.be.not.null;
                });
            });
            describe('when filter does not exists in filters array', () => {
                it('should not call funcSpy', () => {
                    handler.invokeCustomFilters(new TestException());
                    expect(funcSpy.notCalled).to.be.true;
                });
                it('should returns null', () => {
                    expect(handler.invokeCustomFilters(new TestException())).to.be.null;
                });
            });
        });
    });
});