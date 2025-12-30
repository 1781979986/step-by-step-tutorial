import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IConfigParser } from '../interfaces';
import {
    TutorialConfig,
    StepConfig,
    ValidationResult,
    ValidationError,
    StepNode
} from '../types';

/**
 * 配置解析器 - 支持 YAML 和 JSON 格式
 */
export class ConfigParser implements IConfigParser {
    /**
     * 解析教程配置文件
     * @param configPath 配置文件路径
     */
    async parse(configPath: string): Promise<TutorialConfig> {
        const content = await fs.promises.readFile(configPath, 'utf-8');
        const ext = path.extname(configPath).toLowerCase();

        let rawConfig: unknown;

        if (ext === '.yaml' || ext === '.yml') {
            rawConfig = yaml.load(content);
        } else if (ext === '.json') {
            rawConfig = JSON.parse(content);
        } else {
            throw new Error(`Unsupported config file format: ${ext}. Use .yaml, .yml, or .json`);
        }

        const validationResult = this.validate(rawConfig);
        if (!validationResult.valid) {
            const errorMessages = validationResult.errors
                .map(e => `${e.path}: ${e.message}`)
                .join('\n');
            throw new Error(`Invalid tutorial config:\n${errorMessages}`);
        }

        return rawConfig as TutorialConfig;
    }

    /**
     * 验证配置格式
     * @param config 待验证的配置对象
     */
    validate(config: unknown): ValidationResult {
        const errors: ValidationError[] = [];

        if (!config || typeof config !== 'object') {
            return {
                valid: false,
                errors: [{ path: 'root', message: 'Config must be an object' }]
            };
        }

        const cfg = config as Record<string, unknown>;

        // 验证必要字段
        if (!cfg.name || typeof cfg.name !== 'string') {
            errors.push({ path: 'name', message: 'name is required and must be a string' });
        }

        if (!cfg.description || typeof cfg.description !== 'string') {
            errors.push({ path: 'description', message: 'description is required and must be a string' });
        }

        if (!cfg.version || typeof cfg.version !== 'string') {
            errors.push({ path: 'version', message: 'version is required and must be a string' });
        }

        // 验证 steps 数组
        if (!Array.isArray(cfg.steps)) {
            errors.push({ path: 'steps', message: 'steps is required and must be an array' });
        } else if (cfg.steps.length === 0) {
            errors.push({ path: 'steps', message: 'steps array must not be empty' });
        } else {
            const stepErrors = this.validateSteps(cfg.steps as unknown[]);
            errors.push(...stepErrors);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证步骤数组
     */
    private validateSteps(steps: unknown[]): ValidationError[] {
        const errors: ValidationError[] = [];
        const stepIds = new Set<string>();

        steps.forEach((step, index) => {
            const stepPath = `steps[${index}]`;

            if (!step || typeof step !== 'object') {
                errors.push({ path: stepPath, message: 'step must be an object' });
                return;
            }

            const s = step as Record<string, unknown>;

            // 验证必要字段
            if (!s.id || typeof s.id !== 'string') {
                errors.push({ path: `${stepPath}.id`, message: 'id is required and must be a string' });
            } else {
                // 检查 ID 唯一性
                if (stepIds.has(s.id)) {
                    errors.push({ path: `${stepPath}.id`, message: `duplicate step id: ${s.id}` });
                }
                stepIds.add(s.id);
            }

            if (!s.title || typeof s.title !== 'string') {
                errors.push({ path: `${stepPath}.title`, message: 'title is required and must be a string' });
            }

            if (!s.gitRef || typeof s.gitRef !== 'string') {
                errors.push({ path: `${stepPath}.gitRef`, message: 'gitRef is required and must be a string' });
            }

            if (!s.explanation || typeof s.explanation !== 'string') {
                errors.push({ path: `${stepPath}.explanation`, message: 'explanation is required and must be a string' });
            }

            // parentId 是可选的，但如果存在必须是字符串
            if (s.parentId !== undefined && typeof s.parentId !== 'string') {
                errors.push({ path: `${stepPath}.parentId`, message: 'parentId must be a string if provided' });
            }

            // description 是可选的
            if (s.description !== undefined && typeof s.description !== 'string') {
                errors.push({ path: `${stepPath}.description`, message: 'description must be a string if provided' });
            }
        });

        // 验证 parentId 引用有效性
        steps.forEach((step, index) => {
            const s = step as Record<string, unknown>;
            if (s.parentId && typeof s.parentId === 'string') {
                if (!stepIds.has(s.parentId)) {
                    errors.push({
                        path: `steps[${index}].parentId`,
                        message: `parentId references non-existent step: ${s.parentId}`
                    });
                }
            }
        });

        return errors;
    }

    /**
     * 将 StepConfig 数组转换为 StepNode 数组（构建树结构）
     * @param stepConfigs 步骤配置数组
     */
    buildStepTree(stepConfigs: StepConfig[]): StepNode[] {
        // 创建 ID 到节点的映射
        const nodeMap = new Map<string, StepNode>();

        // 第一遍：创建所有节点
        for (const config of stepConfigs) {
            const node: StepNode = {
                id: config.id,
                title: config.title,
                description: config.description || '',
                gitRef: config.gitRef,
                parentId: config.parentId || null,
                children: [],
                explanationPath: config.explanation
            };
            nodeMap.set(config.id, node);
        }

        // 第二遍：建立父子关系
        for (const node of nodeMap.values()) {
            if (node.parentId) {
                const parent = nodeMap.get(node.parentId);
                if (parent) {
                    parent.children.push(node.id);
                }
            }
        }

        return Array.from(nodeMap.values());
    }

    /**
     * 序列化配置为 YAML 字符串
     */
    serializeToYaml(config: TutorialConfig): string {
        return yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
    }

    /**
     * 序列化配置为 JSON 字符串
     */
    serializeToJson(config: TutorialConfig): string {
        return JSON.stringify(config, null, 2);
    }
}

// 导出单例
export const configParser = new ConfigParser();
