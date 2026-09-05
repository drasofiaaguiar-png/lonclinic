/**
 * Shared scoring for Lon Clinic clinical questionnaires (Node + browser).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ClinicalQuizScore = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function mean(arr) {
        return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0;
    }

    function sum(arr) {
        return arr.reduce(function (a, b) { return a + b; }, 0);
    }

    function questionOptions(def, q) {
        return (q && q.options && q.options.length) ? q.options : (def.options || []);
    }

    function optionMax(opts) {
        var m = 0;
        (opts || []).forEach(function (o) {
            var v = Number(o.v);
            if (Number.isFinite(v) && v > m) m = v;
        });
        return m;
    }

    function itemValue(def, q, raw) {
        var v = Number(raw);
        if (!Number.isFinite(v)) v = 0;
        if (q.reversed) {
            var cap = q.reverseMax != null ? Number(q.reverseMax) : optionMax(questionOptions(def, q));
            return cap - v;
        }
        return v;
    }

    function bandFor(def, score) {
        var bands = def.bands || [];
        var n = Number(score);
        if (!Number.isFinite(n)) n = 0;
        for (var i = 0; i < bands.length; i++) {
            if (n <= Number(bands[i].max)) return bands[i];
        }
        return bands[bands.length - 1] || null;
    }

    function scalePercents(def, answers) {
        var buckets = {};
        (def.questions || []).forEach(function (q, i) {
            var id = q.scale || 'total';
            if (!buckets[id]) buckets[id] = { values: [], max: 0 };
            var opts = questionOptions(def, q);
            var cap = q.reversed && q.reverseMax != null ? Number(q.reverseMax) : optionMax(opts);
            buckets[id].values.push(itemValue(def, q, answers[i]));
            if (cap > buckets[id].max) buckets[id].max = cap;
        });
        var out = {};
        Object.keys(buckets).forEach(function (id) {
            var b = buckets[id];
            var avg = mean(b.values);
            out[id] = {
                raw: Math.round(sum(b.values) * 10) / 10,
                value: b.max ? Math.round((avg / b.max) * 100) : 0
            };
        });
        return out;
    }

    function dominantScale(scales, insights) {
        var keys = Object.keys(scales || {});
        if (!keys.length) return null;
        keys.sort(function (a, b) { return scales[b].value - scales[a].value; });
        var top = keys[0];
        if (insights && insights[top] && scales[top].value >= 45) return top;
        if (insights && insights[top]) return top;
        return top;
    }

    function scoreYfas(def, answers) {
        var count = 0;
        var impairment = false;
        (def.questions || []).forEach(function (q, i) {
            var v = Number(answers[i]) || 0;
            if (q.impairment) {
                if (v >= 3) impairment = true;
            } else if (q.criterion) {
                if (v >= 3) count += 1;
            }
        });
        var bandRaw = (!impairment || count < 2) ? 0 : count;
        var gaugePct = Math.round((count / 11) * 100);
        return {
            raw: bandRaw,
            display: count,
            displayMax: 11,
            gaugePct: gaugePct,
            extra: { count: count, impairment: impairment }
        };
    }

    function scoreTfeq(def, answers, scales) {
        var cr = (scales.cr && scales.cr.value) || 0;
        var ue = (scales.ue && scales.ue.value) || 0;
        var ee = (scales.ee && scales.ee.value) || 0;
        var top = Math.max(cr, ue, ee);
        return {
            raw: top,
            display: top,
            displayMax: 100,
            gaugePct: top
        };
    }

    function scoreSf12(def, answers, scales) {
        var pcs = (scales.pcs && scales.pcs.value) || 0;
        var mcs = (scales.mcs && scales.mcs.value) || 0;
        var global = Math.round((pcs + mcs) / 2);
        return {
            raw: global,
            display: global,
            displayMax: 100,
            gaugePct: global
        };
    }

    function scoreSumLike(def, answers) {
        var total = 0;
        (def.questions || []).forEach(function (q, i) {
            total += itemValue(def, q, answers[i]);
        });
        var mult = Number(def.displayMultiplier) || 1;
        var display = Math.round(total * mult);
        var displayMax = def.scoring === 'who5' ? 100 : (Number(def.gaugeMax) || display);
        if (def.scoring === 'who5') {
            return {
                raw: display,
                display: display,
                displayMax: 100,
                gaugePct: display
            };
        }
        var gaugeMax = Number(def.gaugeMax) || displayMax || 1;
        var bandScore = def.bandOn === 'display' ? display : total;
        return {
            raw: bandScore,
            display: display,
            displayMax: displayMax,
            gaugePct: Math.round((total / gaugeMax) * 100)
        };
    }

    function answerById(def, answers, id) {
        var i = -1;
        (def.questions || []).forEach(function (q, idx) {
            if (q.id === id) i = idx;
        });
        return i < 0 ? NaN : Number(answers[i]);
    }

    function round1(n) {
        return Math.round(n * 10) / 10;
    }

    function round2(n) {
        return Math.round(n * 100) / 100;
    }

    function ptNum(n) {
        if (!Number.isFinite(n)) return '—';
        var s = (Math.round(n * 10) / 10).toFixed(1);
        if (s.slice(-2) === '.0') s = s.slice(0, -2);
        return s.replace('.', ',');
    }

    function heightToMeters(raw) {
        var h = Number(raw);
        if (!Number.isFinite(h) || h <= 0) return NaN;
        return h > 3 ? h / 100 : h;
    }

    function scoreImc(def, answers) {
        var sex = answerById(def, answers, 'sex');
        var meters = heightToMeters(answerById(def, answers, 'height'));
        var weight = answerById(def, answers, 'weight');
        var waist = answerById(def, answers, 'waist');
        if (!Number.isFinite(meters) || !Number.isFinite(weight) || meters < 1.2 || meters > 2.3) {
            return null;
        }
        var bmi = weight / (meters * meters);
        var bmi1 = round1(bmi);
        var healthyMin = round1(18.5 * meters * meters);
        var healthyMax = round1(24.9 * meters * meters);
        var kgToLose = bmi1 > 24.9 ? round1(Math.max(0, weight - healthyMax)) : 0;
        var kgToGain = bmi1 < 18.5 ? round1(Math.max(0, healthyMin - weight)) : 0;

        var woman = sex === 0;
        var waistSkipped = !Number.isFinite(waist) || waist <= 0;
        var waistRisk = 'unknown';
        var waistPct = 0;
        if (!waistSkipped) {
            var t1 = woman ? 80 : 94;
            var t2 = woman ? 88 : 102;
            if (waist >= t2) {
                waistRisk = 'very';
                waistPct = 100;
            } else if (waist >= t1) {
                waistRisk = 'increased';
                waistPct = 65;
            } else {
                waistRisk = 'ok';
                waistPct = Math.round((waist / t1) * 40);
            }
        }

        var imcPct = Math.max(0, Math.min(100, Math.round(((bmi1 - 15) / 25) * 100)));
        var band = bandFor(def, bmi1);
        var bandCopy = band ? {
            max: band.max,
            pill: band.pill,
            concern: band.concern,
            title: band.title,
            bookLabel: band.bookLabel,
            bookNote: band.bookNote,
            text: '',
            cta: ''
        } : null;

        var waistLine = waistSkipped
            ? 'Não indicaste o perímetro abdominal — o IMC sozinho não vê gordura visceral.'
            : (waistRisk === 'very'
                ? 'A cintura (' + ptNum(waist) + ' cm) está na zona de risco muito aumentado.'
                : (waistRisk === 'increased'
                    ? 'A cintura (' + ptNum(waist) + ' cm) está na zona de risco aumentado.'
                    : 'A cintura (' + ptNum(waist) + ' cm) está abaixo do limiar de risco para o sexo indicado.'));

        if (bandCopy) {
            if (bmi1 < 18.5) {
                bandCopy.text = 'O teu IMC é ' + ptNum(bmi1) + ' kg/m² (baixo peso). A faixa considerada normal para a tua altura é ' + ptNum(healthyMin) + '–' + ptNum(healthyMax) + ' kg. Faltam cerca de ' + ptNum(kgToGain) + ' kg para chegares ao limite inferior (IMC 18,5).';
                bandCopy.cta = 'Baixo peso também pede avaliação — défices, tiróide, malabsorção ou um padrão alimentar. A consulta de clínica geral (39€) ordena essa conversa.';
            } else if (bmi1 <= 24.9) {
                bandCopy.text = 'O teu IMC é ' + ptNum(bmi1) + ' kg/m² — na faixa considerada normal (18,5–24,9). O intervalo de peso para a tua altura é cerca de ' + ptNum(healthyMin) + '–' + ptNum(healthyMax) + ' kg. Não precisas de perder peso por causa do IMC. ' + waistLine;
                bandCopy.cta = waistRisk === 'increased' || waistRisk === 'very'
                    ? 'A cintura já pede conversa clínica mesmo com IMC normal. Marca consulta para olhar à composição corporal, não só ao número da balança.'
                    : 'Se a energia, a fome ou o sono forem o tema, os testes de alimentação e o WHO-5 afinam o próximo passo. A consulta continua disponível.';
            } else if (bmi1 < 30) {
                bandCopy.text = 'O teu IMC é ' + ptNum(bmi1) + ' kg/m² (excesso de peso). Para chegares ao limite superior do peso normal (IMC 24,9), o peso-alvo é cerca de ' + ptNum(healthyMax) + ' kg — ou seja, perder cerca de ' + ptNum(kgToLose) + ' kg. ' + waistLine;
                bandCopy.cta = 'IMC acima de 25 pede avaliação médica e nutricional: composição corporal (gordura vs massa magra) e um plano realista. Marca consulta de clínica geral (39€).';
            } else {
                bandCopy.text = 'O teu IMC é ' + ptNum(bmi1) + ' kg/m² (' + (bandCopy.pill || 'obesidade').toLowerCase() + '). Para um IMC 24,9, o peso-alvo é cerca de ' + ptNum(healthyMax) + ' kg — cerca de ' + ptNum(kgToLose) + ' kg a perder. Isto é um alvo clínico, não um prazo. ' + waistLine;
                bandCopy.cta = 'Obesidade pede plano médico e nutricional, não mais uma dieta da internet. Consulta de clínica geral (39€) ou de longevidade (79€) se o quadro for complexo. Em Portugal, análogos GLP-1 só com prescritor elegível.';
            }
        }

        return {
            raw: bmi1,
            display: bmi1,
            displayMax: null,
            gaugePct: imcPct,
            extra: {
                bmi: bmi1,
                weight: weight,
                heightM: round2(meters),
                healthyMin: healthyMin,
                healthyMax: healthyMax,
                kgToLose: kgToLose,
                kgToGain: kgToGain,
                waist: waistSkipped ? null : waist,
                waistRisk: waistRisk,
                sex: woman ? 'mulher' : 'homem',
                decimals: 1
            },
            scalesOverride: {
                imc: { value: imcPct, raw: bmi1, label: ptNum(bmi1) },
                waist: {
                    value: waistPct,
                    raw: waistSkipped ? 0 : waist,
                    label: waistSkipped ? '—' : (waistRisk === 'very' ? 'muito aumentado' : (waistRisk === 'increased' ? 'aumentado' : 'sem limiar de risco'))
                }
            },
            bandOverride: bandCopy
        };
    }

    function scoreQuiz(def, answers) {
        if (!def || !Array.isArray(def.questions)) return null;
        var expected = def.questions.length;
        if (!Array.isArray(answers) || answers.length !== expected) return null;

        if (def.scoring === 'imc') {
            var imcCore = scoreImc(def, answers);
            if (!imcCore) return null;
            return {
                raw: imcCore.raw,
                display: imcCore.display,
                displayMax: imcCore.displayMax,
                gaugePct: Math.max(0, Math.min(100, Number(imcCore.gaugePct) || 0)),
                scales: imcCore.scalesOverride,
                band: imcCore.bandOverride,
                crisis: false,
                extra: imcCore.extra,
                dominant: imcCore.extra && imcCore.extra.kgToLose > 0 ? 'imc' : 'waist'
            };
        }

        var scales = scalePercents(def, answers);
        var core;
        if (def.scoring === 'yfas') core = scoreYfas(def, answers);
        else if (def.scoring === 'tfeq') core = scoreTfeq(def, answers, scales);
        else if (def.scoring === 'sf12') core = scoreSf12(def, answers, scales);
        else core = scoreSumLike(def, answers);

        var band = bandFor(def, core.raw);
        var crisis = false;
        (def.questions || []).forEach(function (q, i) {
            if (q.crisis && (Number(answers[i]) || 0) >= 1) crisis = true;
        });

        var gaugePct = Math.max(0, Math.min(100, Number(core.gaugePct) || 0));
        return {
            raw: core.raw,
            display: core.display,
            displayMax: core.displayMax,
            gaugePct: gaugePct,
            scales: scales,
            band: band,
            crisis: crisis,
            extra: core.extra || null,
            dominant: dominantScale(scales, def.insights)
        };
    }

    function validateAnswers(def, answers) {
        if (!def || !Array.isArray(answers) || answers.length !== def.questions.length) {
            return 'Respostas incompletas.';
        }
        for (var i = 0; i < def.questions.length; i++) {
            var q = def.questions[i];
            var v = Number(answers[i]);
            if (q.input === 'number') {
                if (q.optional && (!Number.isFinite(v) || v === 0)) continue;
                if (!Number.isFinite(v)) return 'Resposta inválida.';
                if (q.id === 'height') {
                    var meters = heightToMeters(v);
                    if (!Number.isFinite(meters) || meters < 1.2 || meters > 2.3) return 'Altura inválida.';
                    continue;
                }
                var min = q.min != null ? Number(q.min) : 0;
                var max = q.max != null ? Number(q.max) : 1000;
                if (v < min || v > max) return 'Resposta inválida.';
                continue;
            }
            var opts = questionOptions(def, q);
            var allowed = opts.map(function (o) { return Number(o.v); });
            if (!Number.isFinite(v) || allowed.indexOf(v) === -1) {
                return 'Resposta inválida.';
            }
        }
        return null;
    }

    return {
        scoreQuiz: scoreQuiz,
        bandFor: bandFor,
        validateAnswers: validateAnswers,
        questionOptions: questionOptions
    };
}));
