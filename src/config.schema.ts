import * as Joi from '@hapi/joi'

export const configValidationSchema = Joi.object({
    STAGE: Joi.string().valid('dev', 'test', 'prod').required(),
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5434).required(),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_DATABASE: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    CORS_ORIGINS: Joi.string().when('STAGE', {
        is: 'prod',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    REQUEST_BODY_LIMIT: Joi.string().pattern(/^\d+(kb|mb)$/i).default('100kb'),
    PASSWORD_RESET_URL: Joi.string().uri({ scheme: ['https'] }).when('STAGE', {
        is: 'prod',
        then: Joi.required(),
        otherwise: Joi.optional(),
    }),
    SMTP_HOST: Joi.string().when('STAGE', { is: 'prod', then: Joi.required(), otherwise: Joi.optional() }),
    SMTP_PORT: Joi.number().port().default(587),
    SMTP_USER: Joi.string().when('STAGE', { is: 'prod', then: Joi.required(), otherwise: Joi.optional() }),
    SMTP_PASSWORD: Joi.string().when('STAGE', { is: 'prod', then: Joi.required(), otherwise: Joi.optional() }),
    SMTP_FROM: Joi.string().when('STAGE', { is: 'prod', then: Joi.required(), otherwise: Joi.optional() }),
})
