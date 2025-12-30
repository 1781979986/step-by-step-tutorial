import { expect } from 'chai';
import { ProgressTracker } from '../../services/progressTracker';

describe('ProgressTracker', () => {
    let tracker: ProgressTracker;

    beforeEach(() => {
        tracker = new ProgressTracker();
    });

    describe('getProgress()', () => {
        it('should return new progress for unknown tutorial', () => {
            const progress = tracker.getProgress('tutorial-1');
            
            expect(progress.tutorialId).to.equal('tutorial-1');
            expect(progress.currentStepId).to.be.null;
            expect(progress.completedSteps).to.have.length(0);
        });

        it('should return same progress on subsequent calls', () => {
            const progress1 = tracker.getProgress('tutorial-1');
            progress1.completedSteps.push('step-1');
            
            const progress2 = tracker.getProgress('tutorial-1');
            expect(progress2.completedSteps).to.include('step-1');
        });
    });

    describe('markStepCompleted()', () => {
        it('should add step to completed list', () => {
            tracker.markStepCompleted('tutorial-1', 'step-1');
            
            const progress = tracker.getProgress('tutorial-1');
            expect(progress.completedSteps).to.include('step-1');
        });

        it('should not duplicate completed steps', () => {
            tracker.markStepCompleted('tutorial-1', 'step-1');
            tracker.markStepCompleted('tutorial-1', 'step-1');
            
            const progress = tracker.getProgress('tutorial-1');
            expect(progress.completedSteps.filter(s => s === 'step-1')).to.have.length(1);
        });
    });

    describe('setCurrentStep()', () => {
        it('should set current step', () => {
            tracker.setCurrentStep('tutorial-1', 'step-2');
            
            const progress = tracker.getProgress('tutorial-1');
            expect(progress.currentStepId).to.equal('step-2');
        });

        it('should mark previous step as completed when changing', () => {
            tracker.setCurrentStep('tutorial-1', 'step-1');
            tracker.setCurrentStep('tutorial-1', 'step-2');
            
            const progress = tracker.getProgress('tutorial-1');
            expect(progress.currentStepId).to.equal('step-2');
            expect(progress.completedSteps).to.include('step-1');
        });
    });

    describe('getStepStatus()', () => {
        it('should return pending for new step', () => {
            const status = tracker.getStepStatus('tutorial-1', 'step-1');
            expect(status).to.equal('pending');
        });

        it('should return current for current step', () => {
            tracker.setCurrentStep('tutorial-1', 'step-1');
            
            const status = tracker.getStepStatus('tutorial-1', 'step-1');
            expect(status).to.equal('current');
        });

        it('should return completed for completed step', () => {
            tracker.markStepCompleted('tutorial-1', 'step-1');
            
            const status = tracker.getStepStatus('tutorial-1', 'step-1');
            expect(status).to.equal('completed');
        });
    });

    describe('resetProgress()', () => {
        it('should clear all progress', () => {
            tracker.setCurrentStep('tutorial-1', 'step-2');
            tracker.markStepCompleted('tutorial-1', 'step-1');
            
            tracker.resetProgress('tutorial-1');
            
            const progress = tracker.getProgress('tutorial-1');
            expect(progress.currentStepId).to.be.null;
            expect(progress.completedSteps).to.have.length(0);
        });
    });

    describe('serialization', () => {
        it('should serialize and deserialize progress', () => {
            tracker.setCurrentStep('tutorial-1', 'step-2');
            tracker.markStepCompleted('tutorial-1', 'step-1');
            
            const json = tracker.serialize();
            
            const newTracker = new ProgressTracker();
            newTracker.deserialize(json);
            
            const progress = newTracker.getProgress('tutorial-1');
            expect(progress.currentStepId).to.equal('step-2');
            expect(progress.completedSteps).to.include('step-1');
        });
    });
});
