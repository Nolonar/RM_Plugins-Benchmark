/*
 * MIT License
 *
 * Copyright (c) 2020 Nolonar
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

//=============================================================================
// Metadata
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Adds a benchmark to the game.
 * @author Nolonar
 * @url https://github.com/Nolonar/RM_Plugins
 * 
 * @param mode
 * @text Benchmarking mode
 * @desc Timed: Benchmark ends after a specified time.
 *       Scripted: Benchmark ends via plugin command.
 * @type select
 * @option Timed
 * @option Scripted
 * @default Timed
 *
 * @param durationMs
 * @parent mode
 * @text Duration
 * @desc Timed mode only. How long (in milliseconds) the benchmark lasts.
 * @type number
 * @default 10000
 * 
 * @param mapId
 * @text Map ID
 * @desc The ID of the map to benchmark.
 * @type number
 * @default 1
 * 
 * @param x
 * @text X position
 * @desc The X position where to put the player on the benchmark map.
 * @type number
 * @min 0
 * @default 0
 * 
 * @param y
 * @text Y position
 * @desc The Y position where to put the player on the benchmark map.
 * @type number
 * @min 0
 * @default 0
 * 
 * @param switchId
 * @text Switch
 * @desc The switch that represents whether a benchmark is running.
 * @type switch
 * @default 0
 *
 * @param isShowFrameTime
 * @text Show frame time
 * @desc Whether to show frame time (in addition to FPS).
 * @type boolean
 * @default true
 * 
 * @param isDevOnly
 * @text Development only
 * @desc Whether to allow players to access the benchmark. If ON, players won't be able to access the benchmark.
 * @type boolean
 * @default true
 * 
 * @param textBenchmark
 * @text "Benchmark" text
 * @desc The text to display for the "Benchmark" command on the Title screen.
 * @type string
 * @default Benchmark
 * 
 * @param textRunning
 * @text "Benchmark running" text
 * @desc The text to display while the benchmark is running.
 * @type string
 * @default Benchmark running
 * 
 * @param textFastest
 * @text "Fastest" text
 * @desc The text to display to describe the fastest frame time.
 * @type string
 * @default Fastest
 *
 * @param textSlowest
 * @text "Slowest" text
 * @desc The text to display to describe the slowest frame time.
 * @type string
 * @default Slowest
 *
 * @param textAverage
 * @text "Average" text
 * @desc The text to display to describe the average frame time.
 * @type string
 * @default Average
 * 
 * 
 * @command stop
 * @text Stop benchmark
 * @desc Scripted mode only. Stops the benchmark and shows the results.
 *
 *
 * @help Version 1.1.2
 */

(() => {
    const PLUGIN_NAME = "N_Benchmark";

    const COMMAND_STOP = "stop";

    const OPTION_MODE_TIMED = "Timed";
    const OPTION_MODE_SCRIPTED = "Scripted";

    const SYMBOL_BENCHMARK = "benchmark";

    const parameters = PluginManager.parameters(PLUGIN_NAME);
    parameters.mode = parameters.mode || OPTION_MODE_TIMED;
    parameters.mapId = Number(parameters.mapId) || 1;
    parameters.x = Number(parameters.x) || 1;
    parameters.y = Number(parameters.y) || 1;
    parameters.switchId = Number(parameters.switchId) || 0;
    parameters.durationMs = Number(parameters.durationMs) || 10000;
    parameters.isShowFrameTime = parameters.isShowFrameTime !== "false";
    parameters.isDevOnly = parameters.isDevOnly !== "false";
    parameters.textBenchmark = parameters.textBenchmark || "Benchmark";
    parameters.textRunning = parameters.textRunning || "Benchmark running";
    parameters.textFastest = parameters.textFastest || "Fastest";
    parameters.textSlowest = parameters.textSlowest || "Slowest";
    parameters.textAverage = parameters.textAverage || "Average";

    PluginManager.registerCommand(PLUGIN_NAME, COMMAND_STOP, () => {
        if (parameters.mode === OPTION_MODE_SCRIPTED)
            SceneManager._scene.stopBenchmark?.();
    });

    const frameTimes = [];

    function getFPS(frameTime) {
        return 1000 / frameTime;
    }

    function getFrameTimeColor(frameTime) {
        return `#${getRed(frameTime)}${getGreen(frameTime)}00`;
    }

    function getRed(frameTime) {
        const red = 1 - (getFPS(frameTime) - 30) / 30;
        return getHexValue(255 * red);
    }

    function getGreen(frameTime) {
        const green = (getFPS(frameTime) - 20) / 10;
        return getHexValue(255 * green);
    }

    function getHexValue(decimal, digitCount) {
        digitCount = digitCount ?? 2;
        return ("0".repeat(digitCount) + Math.floor(decimal).clamp(0, 255).toString(16)).substr(-digitCount);
    }

    class Window_BenchmarkInfo extends Window_Base {
        initialize(scene) {
            const lines = {
                [OPTION_MODE_TIMED]: 2,
                [OPTION_MODE_SCRIPTED]: 1
            }[parameters.mode];

            super.initialize(new Rectangle(0, 0, 360, this.fittingHeight(lines)));

            this.opacity = 0;
            scene.addChild(this);

            this.endTime = new Date(new Date().getTime() + parameters.durationMs);
        }

        get timeLeft() {
            return Math.max(this.endTime.getTime() - new Date().getTime(), 0);
        }

        update() {
            super.update();
            this.drawContent();
        }

        drawContent() {
            this.contents.clear();
            const width = this.contentsWidth();
            this.drawBackground(0, 0, width, this.lineHeight());
            const parts = [parameters.textRunning];
            if (parameters.mode === OPTION_MODE_TIMED)
                parts.push(`${this.timeLeft} ms`);

            const text = parts.join("\n");
            this.drawText(text, 0, 0, width, 'left');
        }

        drawBackground(x, y, width, height) {
            Window_MapName.prototype.drawBackground.call(this, x, y, width, height);
        }
    }

    class Window_BenchmarkGraph extends Window_Base {
        initialize(scene) {
            super.initialize(new Rectangle(0, 0, Graphics.width, Math.floor(Graphics.height / 2)));
            this.backOpacity = 255;
            this.drawContent();

            scene.addChild(this);
        }

        get graphData() {
            const x = [], y = [];
            for (const frameTime of [...frameTimes].sort()) {
                const t = Number(frameTime.toFixed(1));
                if (x.length && x.slice(-1)[0] === t) {
                    y[y.length - 1]++;
                }
                else {
                    x.push(t);
                    y.push(1);
                }
            }
            return {
                x: x,
                y: y
            };
        }

        get drawableRect() {
            return new Rectangle(0, 0, this.innerWidth, this.innerHeight);
        }

        getLabels(graphData, xLabelCount, yLabelCount) {
            const maxX = this.getNextMultipleOfTen(Math.ceil(graphData.x.slice(-1)[0]));
            const maxY = this.getNextMultipleOfTen(Math.max(...graphData.y));
            xLabelCount = xLabelCount || 10;
            yLabelCount = yLabelCount || 4;
            const stepX = maxX / xLabelCount;
            const stepY = maxY / yLabelCount;
            return {
                x: [...Array(xLabelCount + 1).keys()].map(i => Math.floor(i * stepX)),
                y: [...Array(yLabelCount + 1).keys()].map(i => Math.floor(i * stepY))
            };
        }

        getNextMultipleOfTen(n) {
            return Math.floor((n + 9) / 10) * 10;
        }

        drawContent() {
            const graphData = this.graphData;
            const labels = this.getLabels(graphData);
            const graphRect = this.drawScale(this.drawableRect, labels.x, labels.y);
            this.drawGraph(graphData, graphRect, labels);
        }

        drawScale(rect, xLabels, yLabels) {
            const paddingX = this.textSizeEx(`${yLabels.slice(-1)[0]}`).width;
            const paddingY = this.lineHeight();
            const offsetY = paddingY / 2;
            const graphRect = new Rectangle(
                rect.left + paddingX,
                rect.top,
                rect.width - paddingX - 1,
                rect.height - 2 * paddingY
            );

            this.drawXAxis(graphRect, xLabels);
            this.drawYAxis(graphRect, yLabels);

            const xLabelDescription = {
                true: "Frame time (ms)",
                false: "FPS"
            }[parameters.isShowFrameTime];
            this.contents.drawText(xLabelDescription, rect.left, rect.bottom - offsetY, rect.width, 0, "center");

            return graphRect;
        }

        drawXAxis(rect, labels) {
            const xStep = rect.width / (labels.length - 1);
            const offsetY = this.lineHeight() / 2;
            for (const i in labels) {
                const frameTime = labels[i];
                let label = parameters.isShowFrameTime ? frameTime : getFPS(frameTime).toFixed(0);
                if (label === "Infinity") label = "\u221e";

                const width = this.textSizeEx(`${label}`).width;
                const x = Math.ceil(rect.left + i * xStep);
                const y = rect.bottom + offsetY;
                this.contents.fillRect(x, rect.top, 1, rect.height + 5, "white");
                const offset = {
                    true: width / 2,
                    false: width
                }[i < labels.length - 1];
                this.contents.textColor = getFrameTimeColor(frameTime);
                this.contents.drawText(label, x - offset, y, width, 0, "left");
            }
            this.contents.textColor = "#ffffff"; // Reset text color.
        }

        drawYAxis(rect, labels) {
            const yStep = rect.height / (labels.length - 1);
            const offsetY = this.lineHeight() / 2;
            for (const i in labels) {
                const label = labels[i];
                const width = this.textSizeEx(`${label}`).width;
                const x = rect.left - width;
                const y = Math.ceil(rect.bottom - i * yStep);
                this.contents.fillRect(rect.left, y, rect.width, 1, "white");
                const offset = {
                    true: 0,
                    false: offsetY
                }[i < labels.length - 1];
                this.contents.drawText(label, x, y + offset, width, 0, "left");
            }
        }

        drawGraph(graphData, graphRect, labels) {
            const maxXValue = labels.x.slice(-1)[0];
            const maxYValue = labels.y.slice(-1)[0];
            for (const i in graphData.x) {
                const xVal = graphData.x[i];
                const yVal = graphData.y[i];

                const x = Math.ceil(graphRect.left + graphRect.width * xVal / maxXValue);
                const height = Math.ceil(graphRect.height * yVal / maxYValue);
                const y = graphRect.bottom - height;
                this.contents.fillRect(x - 1, y, 2, height, "yellow");
            }
        }
    }

    class Window_BenchmarkStatistics extends Window_Base {
        initialize(scene) {
            const height = Graphics.height / 2;
            super.initialize(new Rectangle(0, Math.ceil(height), Graphics.width, Math.floor(height)));
            this.backOpacity = 255;
            this.drawContent();

            scene.addChild(this);
        }

        get drawableRect() {
            return new Rectangle(0, 0, this.innerWidth, this.innerHeight);
        }

        get descriptionRect() {
            const r = this.drawableRect;
            return new Rectangle(r.left, r.top, Math.floor(r.width / 2), r.height);
        }

        get statisticsRect() {
            const r = this.drawableRect;
            const w2 = r.width / 2;
            return new Rectangle(Math.ceil(w2), r.top, Math.floor(w2), r.height);
        }

        drawContent() {
            this.drawStatisticsDescription(this.descriptionRect);
            this.drawStatistics(this.statisticsRect);
        }

        drawStatisticsDescription(rect) {
            const descriptions = [
                `${parameters.textFastest}:`,
                `${parameters.textSlowest}:`,
                `${parameters.textAverage}:`,
                null,
                "25%:",
                "50%:",
                "75%:",
                "99%:"
            ];
            const lineHeight = this.lineHeight();
            for (const i in descriptions) {
                const text = descriptions[i];
                if (text === null) continue;

                const x = rect.x;
                const y = rect.y + i * lineHeight;
                this.contents.drawText(text, x, y, rect.width, lineHeight, "left");
            }
        }

        drawStatistics(rect) {
            const times = [...frameTimes].sort();
            const fastest = times[0];
            const slowest = times.slice(-1)[0];
            const average = this.getMedian(times);
            const statistics = [
                fastest,
                slowest,
                average,
                null,
                this.getQuantile(times, .25),
                this.getQuantile(times, .5),
                this.getQuantile(times, .75),
                this.getQuantile(times, .99)
            ];
            const lineHeight = this.lineHeight();
            for (const i in statistics) {
                const stat = statistics[i];
                if (stat === null) continue;

                const text = this.getFrameTimeStatisticLine(stat);
                const x = rect.x;
                const y = rect.y + i * lineHeight;
                this.contents.textColor = getFrameTimeColor(stat);
                this.contents.drawText(text, x, y, rect.width, lineHeight, "right");
            }
        }

        getFrameTimeStatisticLine(frameTime) {
            const fps = getFPS(frameTime).toFixed(1);
            frameTime = frameTime.toFixed(2);
            return parameters.isShowFrameTime ?
                `${frameTime} ms (${fps} FPS)` :
                `${fps} FPS`;
        }

        getMedian(sortedData) {
            const offset = sortedData.length % 2;
            const halfPoint = Math.floor(sortedData.length / 2) - 1 + offset;
            const centerValues = sortedData.slice(halfPoint, halfPoint + 2 - offset);
            return centerValues.reduce((a, b) => a + b, 0) / centerValues.length;
        }

        getQuantile(sortedData, q) {
            return sortedData[Math.floor(sortedData.length * q)];
        }
    }

    let isBenchmarkRunning = false;
    class Scene_Benchmark extends Scene_Map {
        initialize() {
            super.initialize();

            this._isExiting = false;
        }

        start() {
            super.start();
            this.startBenchmark();
            $gameSwitches.setValue(parameters.switchId, true);
        }

        startBenchmark() {
            frameTimes.length = 0; // Clear frametimes before next run.
            isBenchmarkRunning = true;

            this.windowInfo = new Window_BenchmarkInfo(this);
            this.windowInfo.show();

            if (parameters.mode === OPTION_MODE_TIMED) {
                setTimeout(() => {
                    this.stopBenchmark();
                }, parameters.durationMs);
            }
        }

        stopBenchmark() {
            isBenchmarkRunning = false;
            this.windowInfo.hide();
            new Window_BenchmarkGraph(this).show();
            new Window_BenchmarkStatistics(this).show();
        }

        isMenuEnabled() { return false; }
        isAutosaveEnabled() { return false; }

        commandToTitle() {
            this._isExiting = true;
            isBenchmarkRunning = false;
            $gameSwitches.setValue(parameters.switchId, false);
            Scene_GameEnd.prototype.commandToTitle.call(this);
        }

        update() {
            super.update();
            if (!this._isExiting && this.isTriggered())
                this.commandToTitle();
        }

        updateMain() {
            if (!this._isExiting) {
                $gameMap.update(this.isActive());
                $gamePlayer.update(this.isPlayerActive());
            }
            $gameTimer.update(this.isActive());
            $gameScreen.update();
        }

        updateChildren() {
            if (!this._isExiting)
                super.updateChildren();
        }

        isTriggered() {
            return Input.isRepeated("ok")
                || Input.isRepeated("cancel")
                || TouchInput.isRepeated();
        }
    }

    const FPSCounter_endTick = Graphics.FPSCounter.prototype.endTick;
    Graphics.FPSCounter.prototype.endTick = function () {
        FPSCounter_endTick.call(this);

        if (isBenchmarkRunning)
            frameTimes.push(this._frameTime);
    }

    const Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function () {
        Window_TitleCommand_makeCommandList.call(this);
        if ($gameTemp.isPlaytest() || !parameters.isDevOnly)
            this.addCommand(parameters.textBenchmark, SYMBOL_BENCHMARK);
    }

    const Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        Scene_Title_createCommandWindow.call(this);
        this._commandWindow.setHandler(SYMBOL_BENCHMARK, function () {
            this.commandNewGame.call(this);
            $gamePlayer.reserveTransfer(parameters.mapId, parameters.x, parameters.y, 2, 0);
            SceneManager.goto(Scene_Benchmark);
        }.bind(this));
    }

    const Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function () {
        return !(SceneManager._scene instanceof Scene_Benchmark)
            && Game_Player_canMove.call(this);
    }
})();