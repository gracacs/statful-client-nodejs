'use strict';

/*jshint -W003 */

var Client = require('../lib/client');

var udpServer = require('./tools/udp-server');
var httpsServer = require('./tools/https-server');
var logger = require('bunyan').createLogger({ name: 'tests' });

var expect = require('chai').expect;

describe('When sending timer metrics', function () {
    var httpPort = Math.floor(Math.random() * 10000) + 11025;
    var udpPort = Math.floor(Math.random() * 10000) + 1024;
    var apiConf = {
        host: '127.0.0.1',
        port: httpPort,
        token: 'my-token'
    };

    var victim = new Client(
        {
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1
        },
        logger
    );

    it('should send simple timer with defaults', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.timer('my_metric', 1, null, false);

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ avg,p90,count,10$/);
            done();
        }
    });

    it('should send timer with custom aggregations', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.timer('my_metric', 1, { agg: ['last'] });

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ avg,p90,count,last,10$/);
            done();
        }
    });

    it('should send timer with custom tags', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.timer('my_metric', 1, { tags: { cluster: 'test' } });

        // Then
        function onResponse (lines) {
            udpServer.stop();
            expect(lines.toString()).to.match(
                /^application.timer.my_metric,cluster=test,unit=ms 1 \d+ avg,p90,count,10$/
            );
            done();
        }
    });

    it('should send timer with custom aggregation frequency', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        // When
        victim.timer('my_metric', 1, { aggFreq: 120 });

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ avg,p90,count,120$/);
            done();
        }
    });

    it('should configure default tags for timers', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'udp',
                port: udpPort,
                flushSize: 1,
                default: {
                    timer: {
                        tags: { cluster: 'test' }
                    }
                }
            },
            logger
        );

        // When
        victim.timer('my_metric', 1);

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,cluster=test 1 \d+ avg,p90,count,10$/);
            done();
        }
    });

    it('should merge default timer tags', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'udp',
                port: udpPort,
                flushSize: 1,
                default: {
                    timer: {
                        tags: { env: 'qa' }
                    }
                }
            },
            logger
        );

        // When
        victim.timer('my_metric', 1, { tags: { cluster: 'test' } });

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(
                /^application.timer.my_metric,cluster=test,env=qa 1 \d+ avg,p90,count,10$/
            );
            done();
        }
    });

    it('should configure default aggregations for timers', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'udp',
                port: udpPort,
                flushSize: 1,
                default: {
                    timer: {
                        agg: ['sum']
                    }
                }
            },
            logger
        );

        // When
        victim.timer('my_metric', 1);

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ sum,10$/);
            done();
        }
    });

    it('should configure default aggregation frequency for timers', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'udp',
                port: udpPort,
                flushSize: 1,
                default: {
                    timer: {
                        aggFreq: 120
                    }
                }
            },
            logger
        );

        // When
        victim.timer('my_metric', 1);

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ avg,p90,count,120$/);
            done();
        }
    });

    it('should override default timer aggregation frequency', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'udp',
                port: udpPort,
                flushSize: 1,
                default: {
                    timer: {
                        aggFreq: 60
                    }
                }
            },
            logger
        );

        // When
        victim.timer('my_metric', 1, { aggFreq: 120 });

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ avg,p90,count,120$/);
            done();
        }
    });

    it('should merge unique aggregations', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'udp',
                port: udpPort,
                flushSize: 1
            },
            logger
        );

        // When
        victim.timer('my_metric', 1, { agg: ['sum'] });

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ avg,p90,count,sum,10$/);
            done();
        }
    });

    it('should handle empty default timer config', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'udp',
                port: udpPort,
                flushSize: 1,
                default: { timer: {} }
            },
            logger
        );

        // When
        victim.timer('my_metric', 1);

        // Then
        function onResponse (lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.timer.my_metric,unit=ms 1 \d+ avg,p90,count,10$/);
            done();
        }
    });

    it('should send aggregated timer', function (done) {
        // Given
        httpsServer.start(httpPort, '127.0.0.1', onResponse, 201, true);

        var victim = new Client(
            {
                systemStats: false,
                transport: 'api',
                api: apiConf,
                compression: true,
                flushSize: 2
            },
            logger
        );

        // When
        victim.aggregatedTimer('my_metric1', 1, 'avg', 60);
        victim.aggregatedTimer('my_metric2', 1, 'avg', 60);

        // Then
        function onResponse (lines) {
            httpsServer.stop();

            expect(lines.toString()).to.match(
                /^application\.timer\.my_metric1,unit=ms 1 \d+\napplication\.timer\.my_metric2,unit=ms 1 \d+$/
            );
            done();
        }
    });
});
