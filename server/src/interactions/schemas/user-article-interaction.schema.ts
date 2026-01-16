import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class UserArticleInteraction {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  objectId: string;

  @Prop({ required: true, default: false, index: true })
  isHidden: boolean;
}

export const UserArticleInteractionSchema = SchemaFactory.createForClass(UserArticleInteraction);

UserArticleInteractionSchema.index({ userId: 1, objectId: 1 }, { unique: true });

