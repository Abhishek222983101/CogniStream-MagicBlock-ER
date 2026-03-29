#!/usr/bin/env python3
"""
MistralFluence Fine-Tuning Script (Phase 2B)
Uses HuggingFace Transformers + QLoRA to fine-tune Mistral-7B on viral script data.
Logs to Weights & Biases for hackathon sponsor track.
Compatible with PyTorch 2.10 + RTX 5050 (sm_120).

Model: Mistral-7B-Instruct-v0.3 (Ministral-3B is too new and unsupported)
Quantization: 4-bit (fits in 8GB VRAM)
"""

import os
import json
import torch
from dataclasses import dataclass
from typing import Optional
import wandb

from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
)
from trl import SFTTrainer
from datasets import Dataset
from peft import LoraConfig, get_peft_model, TaskType


@dataclass
class TrainingConfig:
    model_name: str = "mistralai/Mistral-7B-Instruct-v0.3"
    dataset_path: str = "data/trialmatch_training.jsonl"
    output_dir: str = "models/trialmatch-7b-lora"

    max_seq_length: int = 2048

    # LoRA config
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05

    # Training config (optimized for 8GB VRAM)
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 2
    gradient_accumulation_steps: int = 4
    warmup_steps: int = 50
    learning_rate: float = 2e-4
    weight_decay: float = 0.01
    logging_steps: int = 5
    save_steps: int = 100
    max_grad_norm: float = 0.3

    # W&B config
    wandb_project: str = "trialmatch-finetune"
    wandb_entity: Optional[str] = None


def load_dataset(path: str) -> Dataset:
    """Load ChatML formatted JSONL dataset."""
    data = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                item = json.loads(line)
                messages = item.get("messages", [])

                conversation = ""
                for msg in messages:
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    if role == "system":
                        conversation += f"<tool_call>\n{content}\n"
                    elif role == "user":
                        conversation += f"user\n{content}\n"
                    elif role == "assistant":
                        conversation += f"assistant\n{content}\n"

                if conversation:
                    data.append({"text": conversation})

    print(f"Loaded {len(data)} training examples from {path}")
    return Dataset.from_list(data)


def main():
    config = TrainingConfig()

    print("=" * 60)
    print("TrialMatch AI - Fine-Tuning Phase 2")
    print("=" * 60)
    print(f"Model: {config.model_name}")
    print(f"Dataset: {config.dataset_path}")
    print(f"Output: {config.output_dir}")
    print(f"LoRA rank: {config.lora_r}, alpha: {config.lora_alpha}")
    print(
        f"Batch size: {config.per_device_train_batch_size} x {config.gradient_accumulation_steps} accum"
    )
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    print("=" * 60)

    # Initialize W&B
    print("\nInitializing Weights & Biases...")
    wandb.init(
        project=config.wandb_project,
        name="trialmatch-7b-lora-training",
        config={
            "model": config.model_name,
            "lora_r": config.lora_r,
            "lora_alpha": config.lora_alpha,
            "learning_rate": config.learning_rate,
            "epochs": config.num_train_epochs,
            "batch_size": config.per_device_train_batch_size,
            "gradient_accumulation": config.gradient_accumulation_steps,
            "quantization": "4-bit",
        },
    )
    print(f"W&B dashboard: {wandb.run.url}")

    # 4-bit quantization config (essential for 8GB VRAM)
    print("\nConfiguring 4-bit quantization...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Load model with 4-bit quantization
    print("\nLoading model with 4-bit quantization...")
    print("This will download ~4GB for the 4-bit quantized weights...")
    model = AutoModelForCausalLM.from_pretrained(
        config.model_name,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    # Load tokenizer
    print("\nLoading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        config.model_name,
        trust_remote_code=True,
    )
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # LoRA config
    print("\nAdding LoRA adapters...")
    lora_config = LoraConfig(
        r=config.lora_r,
        lora_alpha=config.lora_alpha,
        lora_dropout=config.lora_dropout,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Load dataset
    print("\nLoading dataset...")
    train_dataset = load_dataset(config.dataset_path)

    # Training arguments
    training_args = TrainingArguments(
        output_dir=config.output_dir,
        num_train_epochs=config.num_train_epochs,
        per_device_train_batch_size=config.per_device_train_batch_size,
        gradient_accumulation_steps=config.gradient_accumulation_steps,
        warmup_steps=config.warmup_steps,
        learning_rate=config.learning_rate,
        weight_decay=config.weight_decay,
        logging_steps=config.logging_steps,
        save_steps=config.save_steps,
        max_grad_norm=config.max_grad_norm,
        bf16=True,  # RTX 5050 supports bf16 natively
        fp16=False,
        optim="adamw_torch",
        save_total_limit=3,
        load_best_model_at_end=False,
        report_to="wandb",
        run_name="trialmatch-7b-lora",
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
    )

    # Create trainer
    print("\nInitializing SFTTrainer...")
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        processing_class=tokenizer,
        peft_config=lora_config,
    )

    # Start training
    print("\n" + "=" * 60)
    print("STARTING TRAINING...")
    print("Monitor at: " + wandb.run.url)
    print("=" * 60 + "\n")

    trainer_stats = trainer.train()

    # Save model
    print("\nSaving LoRA adapter...")
    os.makedirs(config.output_dir, exist_ok=True)
    model.save_pretrained(config.output_dir)
    tokenizer.save_pretrained(config.output_dir)

    # Save training stats
    with open(os.path.join(config.output_dir, "training_stats.json"), "w") as f:
        json.dump(trainer_stats.metrics, f, indent=2)

    # Finish W&B run
    wandb.finish()

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print(f"Adapter saved to: {config.output_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
