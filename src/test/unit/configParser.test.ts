import { expect } from 'chai';
import { ConfigParser } from '../../services/configParser';
import { TutorialConfig, StepConfig } from '../../types';

describe('ConfigParser', () => {
    let parser: ConfigParser;

    beforeEach(() => {
        parser = new ConfigParser();
    });

    describe('validate()', () => {
        it('should accept valid config', () => {
            const validConfig: TutorialConfig = {
                name: 'Test Tutorial',
                description: 'A test tutorial',
                version: '1.0.0',
                steps: [
                    {
                        id: 'step-1',
                        title: 'First Step',
                        description: 'Introduction',
                        gitRef: 'step-1',
                        explanation: 'docs/step-1.md'
                    }
                ]
            };

            const result = parser.validate(validConfig);
            expect(result.valid).to.be.true;
            expect(result.errors).to.have.length(0);
        });

        it('should reject null config', () => {
            const result = parser.validate(null);
            expect(result.valid).to.be.false;
            expect(result.errors[0].message).to.include('must be an object');
        });

        it('should reject config without name', () => {
            const config = {
                description: 'Test',
                version: '1.0.0',
                steps: [{ id: 'step-1', title: 'Step', gitRef: 'ref', explanation: 'doc.md' }]
            };

            const result = parser.validate(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.path === 'name')).to.be.true;
        });

        it('should reject config without steps', () => {
            const config = {
                name: 'Test',
                description: 'Test',
                version: '1.0.0'
            };

            const result = parser.validate(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.path === 'steps')).to.be.true;
        });

        it('should reject empty steps array', () => {
            const config = {
                name: 'Test',
                description: 'Test',
                version: '1.0.0',
                steps: []
            };

            const result = parser.validate(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.message.includes('must not be empty'))).to.be.true;
        });

        it('should reject duplicate step IDs', () => {
            const config = {
                name: 'Test',
                description: 'Test',
                version: '1.0.0',
                steps: [
                    { id: 'step-1', title: 'Step 1', gitRef: 'ref1', explanation: 'doc1.md' },
                    { id: 'step-1', title: 'Step 2', gitRef: 'ref2', explanation: 'doc2.md' }
                ]
            };

            const result = parser.validate(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.message.includes('duplicate'))).to.be.true;
        });

        it('should reject invalid parentId reference', () => {
            const config = {
                name: 'Test',
                description: 'Test',
                version: '1.0.0',
                steps: [
                    { id: 'step-1', title: 'Step 1', gitRef: 'ref1', explanation: 'doc1.md' },
                    { id: 'step-2', title: 'Step 2', gitRef: 'ref2', explanation: 'doc2.md', parentId: 'non-existent' }
                ]
            };

            const result = parser.validate(config);
            expect(result.valid).to.be.false;
            expect(result.errors.some(e => e.message.includes('non-existent'))).to.be.true;
        });

        it('should accept valid parentId reference', () => {
            const config = {
                name: 'Test',
                description: 'Test',
                version: '1.0.0',
                steps: [
                    { id: 'step-1', title: 'Step 1', gitRef: 'ref1', explanation: 'doc1.md' },
                    { id: 'step-2', title: 'Step 2', gitRef: 'ref2', explanation: 'doc2.md', parentId: 'step-1' }
                ]
            };

            const result = parser.validate(config);
            expect(result.valid).to.be.true;
        });
    });

    describe('buildStepTree()', () => {
        it('should build linear step tree', () => {
            const steps: StepConfig[] = [
                { id: 'step-1', title: 'Step 1', description: '', gitRef: 'ref1', explanation: 'doc1.md' },
                { id: 'step-2', title: 'Step 2', description: '', gitRef: 'ref2', explanation: 'doc2.md', parentId: 'step-1' }
            ];

            const nodes = parser.buildStepTree(steps);
            
            expect(nodes).to.have.length(2);
            
            const step1 = nodes.find(n => n.id === 'step-1');
            const step2 = nodes.find(n => n.id === 'step-2');
            
            expect(step1?.children).to.include('step-2');
            expect(step2?.parentId).to.equal('step-1');
        });

        it('should build branching step tree', () => {
            const steps: StepConfig[] = [
                { id: 'step-1', title: 'Step 1', description: '', gitRef: 'ref1', explanation: 'doc1.md' },
                { id: 'step-2a', title: 'Step 2a', description: '', gitRef: 'ref2a', explanation: 'doc2a.md', parentId: 'step-1' },
                { id: 'step-2b', title: 'Step 2b', description: '', gitRef: 'ref2b', explanation: 'doc2b.md', parentId: 'step-1' }
            ];

            const nodes = parser.buildStepTree(steps);
            
            const step1 = nodes.find(n => n.id === 'step-1');
            
            expect(step1?.children).to.have.length(2);
            expect(step1?.children).to.include('step-2a');
            expect(step1?.children).to.include('step-2b');
        });
    });

    describe('serialization', () => {
        it('should serialize to YAML and back', () => {
            const config: TutorialConfig = {
                name: 'Test Tutorial',
                description: 'A test',
                version: '1.0.0',
                steps: [
                    { id: 'step-1', title: 'Step 1', description: 'Desc', gitRef: 'ref1', explanation: 'doc.md' }
                ]
            };

            const yamlStr = parser.serializeToYaml(config);
            expect(yamlStr).to.include('name: Test Tutorial');
            expect(yamlStr).to.include('step-1');
        });

        it('should serialize to JSON and back', () => {
            const config: TutorialConfig = {
                name: 'Test Tutorial',
                description: 'A test',
                version: '1.0.0',
                steps: [
                    { id: 'step-1', title: 'Step 1', description: 'Desc', gitRef: 'ref1', explanation: 'doc.md' }
                ]
            };

            const jsonStr = parser.serializeToJson(config);
            const parsed = JSON.parse(jsonStr);
            
            expect(parsed.name).to.equal(config.name);
            expect(parsed.steps[0].id).to.equal('step-1');
        });
    });
});
