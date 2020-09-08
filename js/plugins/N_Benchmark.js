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
 * @param durationMs
 * @text Duration
 * @desc How long (in milliseconds) the benchmark lasts.
 * @type number
 * @default 10000
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
 *
 * @help Version 1.0.1
 *
 * This plugin does not provide plugin commands.
 */

(() => {
    const PLUGIN_NAME = "N_Benchmark";

    const TEXT_BENCHMARK = "Benchmark";
    const SYMBOL_BENCHMARK = "benchmark";

    const parameters = PluginManager.parameters(PLUGIN_NAME);
    parameters.mapId = Number(parameters.mapId) || 1;
    parameters.x = Number(parameters.x) || 1;
    parameters.y = Number(parameters.y) || 1;
    parameters.durationMs = Number(parameters.durationMs) || 10000;
    parameters.isShowFrameTime = parameters.isShowFrameTime !== "false";
    parameters.isDevOnly = parameters.isDevOnly !== "false";

    const frameTimes = [];

    function getFPS(frameTime) {
        return 1000 / frameTime;
    }

    function getFrameTimeColor(frameTime) {
        return frameTime === null ? "#ffffff" :
            `#${getRed(frameTime)}${getGreen(frameTime)}00`;
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
            const rect = new Rectangle(0, 0, 360, this.fittingHeight(1));
            super.initialize(rect);

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
            let width = this.contentsWidth();
            this.drawBackground(0, 0, width, this.lineHeight());
            this.drawText(`${this.timeLeft} ms`, 0, 0, width, 'left');
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
            let x = [], y = [];
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
                "Fastest:",
                "Slowest:",
                "Average:",
                "",
                "25%:",
                "50%:",
                "75%:",
                "99%:"
            ];
            const lineHeight = this.lineHeight();
            for (const i in descriptions) {
                const text = descriptions[i];
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
                const text = this.getFrameTimeStatisticLine(stat);
                const x = rect.x;
                const y = rect.y + i * lineHeight;
                this.contents.textColor = getFrameTimeColor(stat);
                this.contents.drawText(text, x, y, rect.width, lineHeight, "right");
            }
        }

        getFrameTimeStatisticLine(frameTime) {
            if (frameTime === null)
                return "";

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

    let isBenchmarking = false;
    class Scene_Benchmark extends Scene_Map {
        start() {
            super.start();
            this.startBenchmark();
        }

        startBenchmark() {
            frameTimes.length = 0; // Clear frametimes before next run.
            isBenchmarking = true;
            const windowInfo = new Window_BenchmarkInfo(this);
            windowInfo.show();

            setTimeout(() => {
                isBenchmarking = false;
                windowInfo.hide();
                new Window_BenchmarkGraph(this).show();
                new Window_BenchmarkStatistics(this).show();
            }, parameters.durationMs);
        }

        createButtons() { /* Do not create buttons on benchmark */ }

        isMenuEnabled() {
            return false;
        }

        isAutosaveEnabled() {
            return false;
        }

        commandToTitle() {
            Scene_GameEnd.prototype.commandToTitle.call(this);
        }

        update() {
            super.update();
            if (this.isTriggered())
                this.commandToTitle();
        }

        isTriggered() {
            return Input.isRepeated("ok")
                || Input.isRepeated("cancel")
                || TouchInput.isRepeated();
        }
    }

    let FPSCounter_endTick = Graphics.FPSCounter.prototype.endTick;
    Graphics.FPSCounter.prototype.endTick = function () {
        FPSCounter_endTick.call(this);

        if (isBenchmarking)
            frameTimes.push(this._frameTime);
    }

    let Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function () {
        Window_TitleCommand_makeCommandList.call(this);
        if ($gameTemp.isPlaytest() || !parameters.isDevOnly)
            this.addCommand(TEXT_BENCHMARK, SYMBOL_BENCHMARK);
    }

    let Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        Scene_Title_createCommandWindow.call(this);
        this._commandWindow.setHandler(SYMBOL_BENCHMARK, function () {
            DataManager.setupNewGame();

            // Inject benchmark map coordinates.
            const mapId = parameters.mapId;
            const x = parameters.x;
            const y = parameters.y;
            $gamePlayer.reserveTransfer(mapId, x, y, 2, 0);

            this._commandWindow.close();
            this.fadeOutAll();
            SceneManager.goto(Scene_Benchmark);
        }.bind(this));
    }

    let Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function () {
        return SceneManager._scene.constructor !== Scene_Benchmark
            && Game_Player_canMove.call(this);
    }
})();
