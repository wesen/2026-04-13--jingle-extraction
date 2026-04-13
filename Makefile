# Jingle Extractor Makefile

.PHONY: help install install-heavy test clean lint format

PYTHON := python3
VENV := .venv
PIP := $(VENV)/bin/pip
PYTHON_VENV := $(VENV)/bin/python

help: ## Show this help message
	@echo "Jingle Extractor - Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

$(VENV)/bin/activate: requirements.txt
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

touch $(VENV)/bin/activate

install: $(VENV)/bin/activate ## Install base dependencies (requests, librosa, pydub)

install-heavy: install ## Install heavy dependencies (demucs, whisperx, torch)
	$(PIP) install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
	$(PIP) install demucs
	$(PIP) install whisperx

test: ## Run basic tests
	$(PYTHON_VENV) -c "import jingle_extractor; print('Import OK')"
	$(PYTHON_VENV) jingle_extractor.py --help

clean: ## Clean generated outputs
	rm -rf out/
	rm -rf __pycache__/
	rm -rf *.pyc
	rm -rf .pytest_cache/

distclean: clean ## Clean everything including virtual environment
	rm -rf $(VENV)/

lint: ## Run basic linting
	$(PYTHON_VENV) -m py_compile jingle_extractor.py

format: ## Format code (if black is available)
	-$(PYTHON_VENV) -m black jingle_extractor.py 2>/dev/null || echo "black not installed, skipping"

# Example usage targets
generate-example: install-heavy ## Generate example instrumental tracks
	$(PYTHON_VENV) jingle_extractor.py generate \
		--prompt "Instrumental YouTube underscore, sparse plucky synth, bright but not cheesy, 108 BPM feel, clear hook on beat 1, hard stop, no vocals, short intro, short ending" \
		--name "tech_explainer" \
		--count 2 \
		--out-dir out/generated

analyze-example: install-heavy ## Analyze example audio (requires input file)
	@echo "Usage: make analyze-example AUDIO=path/to/song.mp3"
	@if [ -f "$(AUDIO)" ]; then \
		$(PYTHON_VENV) jingle_extractor.py analyze \
			--input-audio "$(AUDIO)" \
			--out-dir out/analysis; \
	else \
		echo "Error: Please provide AUDIO=path/to/song.mp3"; \
		exit 1; \
	fi

full-example: install-heavy ## Run full pipeline example
	$(PYTHON_VENV) jingle_extractor.py full \
		--prompt "Minimal electronic transition cue, tight kick, bright transient, clean ending, no long tail" \
		--name "transition_cue" \
		--count 3 \
		--min-len 2.0 \
		--max-len 4.0 \
		--out-dir out/full
