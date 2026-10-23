import test from 'node:test';
import assert from 'node:assert/strict';
import {expireSource,diskRecord,SOURCE_IDLE_MS} from '../server/retention.js';
test('원문은 디스크 기록에서 제외하고 시험 결과는 유지한다',()=>{const e={id:'exam',source:'학습 원문',sourceTouchedAt:100,questions:[1],answers:[2]};const disk=diskRecord(e);assert.equal(disk.source,undefined);assert.equal(disk.sourceTouchedAt,undefined);assert.deepEqual(disk.answers,[2]);assert.equal(e.source,'학습 원문');});
test('세션 30분 미사용 만료 경계에서 분석 원문을 파기한다',()=>{const e={source:'학습 원문',sourceTouchedAt:100,createdAt:0,questions:[1]};expireSource(e,99+SOURCE_IDLE_MS);assert.equal(e.source,'학습 원문');expireSource(e,100+SOURCE_IDLE_MS);assert.equal(e.source,undefined);assert.deepEqual(e.questions,[1]);});
