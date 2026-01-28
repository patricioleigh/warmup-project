import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class UserArticleInteraction {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  objectId!: string;

  @Prop({ required: true, default: false })
  isHidden!: boolean;
}

export const UserArticleInteractionSchema = SchemaFactory.createForClass(
  UserArticleInteraction,
);

UserArticleInteractionSchema.index(
  { userId: 1, objectId: 1 },
  { unique: true },
);
